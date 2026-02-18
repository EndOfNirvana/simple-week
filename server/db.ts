import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, asc } from "drizzle-orm";
import pg from "pg";
import { users, tasks, notes, weekSettings, weeklySummaries, Task, Note, WeekSettings, WeeklySummary } from "../drizzle/schema";

const { Pool } = pg;

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool);

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
  const result = await db.select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
  
  return result.filter(t => t.date >= startDate && t.date <= endDate);
}

export async function createTask(taskData: {
  userId: number;
  content: string;
  date: string;
  timeBlock: "morning" | "afternoon" | "evening";
  sortOrder?: number;
}): Promise<Task> {
  const result = await db
    .insert(tasks)
    .values({
      userId: taskData.userId,
      content: taskData.content,
      date: taskData.date,
      timeBlock: taskData.timeBlock,
      sortOrder: taskData.sortOrder || 0,
      completed: false,
    })
    .returning();
  return result[0];
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
  const [note] = await db.select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.weekId, weekId)))
    .limit(1);
  return note || null;
}

export async function upsertNote(userId: number, weekId: string, content: string): Promise<Note> {
  const existing = await getNoteForWeek(userId, weekId);
  
  if (existing) {
    const result = await db
      .update(notes)
      .set({ content, updatedAt: new Date() })
      .where(eq(notes.id, existing.id))
      .returning();
    return result[0];
  } else {
    const result = await db
      .insert(notes)
      .values({ userId, weekId, content })
      .returning();
    return result[0];
  }
}

// ============ Week Settings Operations ============

export async function getWeekSettings(userId: number, weekId: string): Promise<WeekSettings | null> {
  const [settings] = await db.select()
    .from(weekSettings)
    .where(and(eq(weekSettings.userId, userId), eq(weekSettings.weekId, weekId)))
    .limit(1);
  return settings || null;
}

export async function upsertWeekSettings(
  userId: number, 
  weekId: string, 
  columnWidths?: Record<number, number>,
  rowHeights?: Record<number, number>
): Promise<WeekSettings> {
  const existing = await getWeekSettings(userId, weekId);
  
  const columnWidthsJson = columnWidths ? JSON.stringify(columnWidths) : null;
  const rowHeightsJson = rowHeights ? JSON.stringify(rowHeights) : null;
  
  if (existing) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (columnWidths !== undefined) updateData.columnWidths = columnWidthsJson;
    if (rowHeights !== undefined) updateData.rowHeights = rowHeightsJson;
    
    const result = await db
      .update(weekSettings)
      .set(updateData)
      .where(eq(weekSettings.id, existing.id))
      .returning();
    return result[0];
  } else {
    const result = await db
      .insert(weekSettings)
      .values({
        userId,
        weekId,
        columnWidths: columnWidthsJson,
        rowHeights: rowHeightsJson,
      })
      .returning();
    return result[0];
  }
}

// ============ Weekly Summary Operations ============

export async function getWeeklySummary(userId: number, weekId: string): Promise<WeeklySummary | null> {
  const [summary] = await db.select()
    .from(weeklySummaries)
    .where(and(eq(weeklySummaries.userId, userId), eq(weeklySummaries.weekId, weekId)))
    .limit(1);
  return summary || null;
}

export async function upsertWeeklySummary(
  userId: number,
  weekId: string,
  data: {
    keyword?: string | null;
    dailyEntries?: string | null;
    reflection?: string | null;
  }
): Promise<WeeklySummary> {
  const existing = await getWeeklySummary(userId, weekId);

  if (existing) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.keyword !== undefined) updateData.keyword = data.keyword;
    if (data.dailyEntries !== undefined) updateData.dailyEntries = data.dailyEntries;
    if (data.reflection !== undefined) updateData.reflection = data.reflection;

    const result = await db
      .update(weeklySummaries)
      .set(updateData)
      .where(eq(weeklySummaries.id, existing.id))
      .returning();
    return result[0];
  } else {
    const result = await db
      .insert(weeklySummaries)
      .values({
        userId,
        weekId,
        keyword: data.keyword ?? null,
        dailyEntries: data.dailyEntries ?? null,
        reflection: data.reflection ?? null,
      })
      .returning();
    return result[0];
  }
}

// ============ Custom Content Operations ============

export async function updateCustomContent(
  userId: number,
  weekId: string,
  customText?: string | null,
  customImageUrl?: string | null
): Promise<WeekSettings> {
  const existing = await getWeekSettings(userId, weekId);

  if (existing) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (customText !== undefined) updateData.customText = customText;
    if (customImageUrl !== undefined) updateData.customImageUrl = customImageUrl;

    const result = await db
      .update(weekSettings)
      .set(updateData)
      .where(eq(weekSettings.id, existing.id))
      .returning();
    return result[0];
  } else {
    const result = await db
      .insert(weekSettings)
      .values({
        userId,
        weekId,
        customText: customText ?? null,
        customImageUrl: customImageUrl ?? null,
      })
      .returning();
    return result[0];
  }
}
