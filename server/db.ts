import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, asc, between, inArray, max, sql } from "drizzle-orm";
import pg from "pg";
import { users, tasks, notes, weekSettings, weeklySummaries, Task, Note, WeekSettings, WeeklySummary } from "../drizzle/schema";
import { moveTaskWithinWeek, parseDailyEntries, type DailyEntries } from "../shared/week-data";
import { getWeekStorageKeys, selectWeekRecord } from "../shared/week-id";

const { Pool } = pg;

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool);
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function lockWeekRecords(tx: Transaction, userId: number, weekId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(2, hashtext(${String(userId) + ':' + weekId}))`);
}

// ============ User Operations ============

export async function upsertUser(userData: {
  clerkId: string;
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
}): Promise<void> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userData.clerkId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(users)
      .set({
        name: userData.name,
        email: userData.email,
        imageUrl: userData.imageUrl,
        lastSignedIn: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, userData.clerkId));
  } else {
    await db.insert(users).values({
      clerkId: userData.clerkId,
      name: userData.name,
      email: userData.email,
      imageUrl: userData.imageUrl,
    });
  }
}

export async function getUserByClerkId(clerkId: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return result[0] || null;
}

// ============ Task Operations ============

export async function getTasksForWeek(userId: number, startDate: string, endDate: string): Promise<Task[]> {
  return db.select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), between(tasks.date, startDate, endDate)))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt), asc(tasks.id));
}

export async function createTask(taskData: {
  userId: number;
  content: string;
  date: string;
  timeBlock: "morning" | "afternoon" | "evening";
  sortOrder?: number;
}): Promise<Task> {
  return db.transaction(async tx => {
    const { userId, date, timeBlock } = taskData;
    // Appends and reorders for the same user must agree about the current order.
    await tx.execute(sql`select pg_advisory_xact_lock(1, ${userId})`);
    const [order] = await tx.select({ last: max(tasks.sortOrder) }).from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.date, date), eq(tasks.timeBlock, timeBlock)));
    const [task] = await tx.insert(tasks).values({
      ...taskData,
      sortOrder: taskData.sortOrder ?? (order.last ?? -1) + 1,
      completed: false,
    }).returning();
    return task;
  });
}

export async function moveTask(userId: number, input: {
  id: number;
  date: string;
  timeBlock: Task['timeBlock'];
  targetTaskId?: number;
}): Promise<Task[]> {
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(1, ${userId})`);
    const [task] = await tx.select().from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.id, input.id)));
    if (!task) return [];

    const destination = await tx.select().from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.date, input.date), eq(tasks.timeBlock, input.timeBlock)))
      .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt), asc(tasks.id));
    const changes = moveTaskWithinWeek(destination, task, input, input.targetTaskId);
    if (changes.length === 0) return [];

    const positions = sql.join(changes.map(item => sql`when ${item.id} then ${item.sortOrder}::integer`), sql` `);
    return tx.update(tasks).set({
      date: input.date,
      timeBlock: input.timeBlock,
      sortOrder: sql`case ${tasks.id} ${positions} else ${tasks.sortOrder} end`,
      updatedAt: new Date(),
    }).where(and(eq(tasks.userId, userId), inArray(tasks.id, changes.map(item => item.id)))).returning();
  });
}

export async function updateTask(
  id: number,
  userId: number,
  updates: Partial<Pick<Task, 'content' | 'completed' | 'date' | 'timeBlock' | 'sortOrder'>>
): Promise<Task | null> {
  const result = await db
    .update(tasks)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();
  return result[0] || null;
}

export async function deleteTask(id: number, userId: number): Promise<boolean> {
  const result = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();
  return result.length > 0;
}

// ============ Note Operations ============

export async function getNoteForWeek(userId: number, weekId: string): Promise<Note | null> {
  return findWeekNote(db, userId, getWeekStorageKeys(weekId));
}

async function findWeekNote(database: typeof db | Transaction, userId: number, keys: string[]) {
  const rows = await database.select()
    .from(notes)
    .where(and(eq(notes.userId, userId), inArray(notes.weekId, keys)))
    .orderBy(asc(notes.id));
  return selectWeekRecord(rows, keys);
}

export async function upsertNote(userId: number, weekId: string, content: string): Promise<Note> {
  const keys = getWeekStorageKeys(weekId);
  const [canonicalId] = keys;
  return db.transaction(async tx => {
    await lockWeekRecords(tx, userId, canonicalId);
    const existing = await findWeekNote(tx, userId, keys);
    if (existing?.weekId === canonicalId) {
      const [updated] = await tx.update(notes).set({ content, updatedAt: new Date() })
        .where(eq(notes.id, existing.id)).returning();
      return updated;
    }
    const [created] = await tx.insert(notes)
      .values({ userId, weekId: canonicalId, content, createdAt: existing?.createdAt }).returning();
    return created;
  });
}

// ============ Week Settings Operations ============

export async function getWeekSettings(userId: number, weekId: string): Promise<WeekSettings | null> {
  return findWeekSettings(db, userId, getWeekStorageKeys(weekId));
}

async function findWeekSettings(database: typeof db | Transaction, userId: number, keys: string[]) {
  const rows = await database.select()
    .from(weekSettings)
    .where(and(eq(weekSettings.userId, userId), inArray(weekSettings.weekId, keys)))
    .orderBy(asc(weekSettings.id));
  return selectWeekRecord(rows, keys);
}

export async function upsertWeekSettings(
  userId: number, 
  weekId: string, 
  columnWidths?: Record<number, number>,
  rowHeights?: Record<number, number>
): Promise<WeekSettings> {
  return saveWeekSettings(userId, weekId, {
    columnWidths: columnWidths === undefined ? undefined : JSON.stringify(columnWidths),
    rowHeights: rowHeights === undefined ? undefined : JSON.stringify(rowHeights),
  });
}

// ============ Weekly Summary Operations ============

export async function getWeeklySummary(userId: number, weekId: string): Promise<WeeklySummary | null> {
  return findWeeklySummary(db, userId, getWeekStorageKeys(weekId));
}

async function findWeeklySummary(database: typeof db | Transaction, userId: number, keys: string[]) {
  const rows = await database.select()
    .from(weeklySummaries)
    .where(and(eq(weeklySummaries.userId, userId), inArray(weeklySummaries.weekId, keys)))
    .orderBy(asc(weeklySummaries.id));
  return selectWeekRecord(rows, keys);
}

export async function upsertWeeklySummary(
  userId: number,
  weekId: string,
  data: {
    keyword?: string | null;
    dailyEntries?: string | null;
    dailyEntryChanges?: DailyEntries;
    reflection?: string | null;
  }
): Promise<WeeklySummary> {
  const keys = getWeekStorageKeys(weekId);
  const [canonicalId] = keys;
  return db.transaction(async tx => {
    // Serialize creation and per-day merges even when the week has no row yet.
    await lockWeekRecords(tx, userId, canonicalId);
    const existing = await findWeeklySummary(tx, userId, keys);
    const dailyEntries = data.dailyEntryChanges
      ? JSON.stringify({ ...parseDailyEntries(existing?.dailyEntries), ...data.dailyEntryChanges })
      : data.dailyEntries;
    const changes = { keyword: data.keyword, dailyEntries, reflection: data.reflection };

    if (existing?.weekId === canonicalId) {
      const [updated] = await tx.update(weeklySummaries)
        .set({ ...changes, updatedAt: new Date() })
        .where(eq(weeklySummaries.id, existing.id)).returning();
      return updated;
    }
    const [created] = await tx.insert(weeklySummaries).values({
      userId,
      weekId: canonicalId,
      keyword: changes.keyword === undefined ? existing?.keyword : changes.keyword,
      dailyEntries: changes.dailyEntries === undefined ? existing?.dailyEntries : changes.dailyEntries,
      reflection: changes.reflection === undefined ? existing?.reflection : changes.reflection,
      createdAt: existing?.createdAt,
    }).returning();
    return created;
  });
}

// ============ Custom Content Operations ============

export async function updateCustomContent(
  userId: number,
  weekId: string,
  customText?: string | null,
  customImageUrl?: string | null
): Promise<WeekSettings> {
  return saveWeekSettings(userId, weekId, { customText, customImageUrl });
}

async function saveWeekSettings(
  userId: number,
  weekId: string,
  changes: Partial<Pick<WeekSettings, 'customText' | 'customImageUrl' | 'columnWidths' | 'rowHeights'>>
): Promise<WeekSettings> {
  const keys = getWeekStorageKeys(weekId);
  const [canonicalId] = keys;
  return db.transaction(async tx => {
    await lockWeekRecords(tx, userId, canonicalId);
    const existing = await findWeekSettings(tx, userId, keys);
    if (existing?.weekId === canonicalId) {
      const [updated] = await tx.update(weekSettings).set({ ...changes, updatedAt: new Date() })
        .where(eq(weekSettings.id, existing.id)).returning();
      return updated;
    }
    const [created] = await tx.insert(weekSettings).values({
      userId,
      weekId: canonicalId,
      customText: changes.customText === undefined ? existing?.customText : changes.customText,
      customImageUrl: changes.customImageUrl === undefined ? existing?.customImageUrl : changes.customImageUrl,
      columnWidths: changes.columnWidths === undefined ? existing?.columnWidths : changes.columnWidths,
      rowHeights: changes.rowHeights === undefined ? existing?.rowHeights : changes.rowHeights,
      createdAt: existing?.createdAt,
    }).returning();
    return created;
  });
}
