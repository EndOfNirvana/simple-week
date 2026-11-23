import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { getLegacyWeekStarts, isWeekStartId } from '../shared/week-id';

const tables = [
  { name: 'notes', fields: ['content'] },
  { name: 'week_settings', fields: ['column_widths', 'row_heights', 'custom_text', 'custom_image_url'] },
  { name: 'weekly_summaries', fields: ['keyword', 'daily_entries', 'reflection'] },
];

type Row = {
  id: number;
  userId: number;
  weekId: string;
  createdAt: string;
  updatedAt: string;
};

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--apply')) {
    throw new Error('Usage: pnpm db:week-ids [--apply]');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const apply = args[0] === '--apply';
  const { db, lockWeekRecords } = await import('../server/db');

  try {
    const eligible: Array<{ table: typeof tables[number]; row: Row; target: string }> = [];
    const review: Array<{ table: string; rows: Row[]; candidates: string[]; reason: string }> = [];
    let existing = 0;

    for (const table of tables) {
      const result = await db.execute<Row>(sql`
        select id, user_id as "userId", week_id as "weekId",
               created_at::text as "createdAt", updated_at::text as "updatedAt"
        from ${sql.identifier(table.name)} order by user_id, week_id, id
      `);
      const groups = new Map<string, Row[]>();
      for (const row of result.rows) {
        const key = `${row.userId}:${row.weekId}`;
        const group = groups.get(key) ?? [];
        group.push(row);
        groups.set(key, group);
      }

      for (const rows of Array.from(groups.values())) {
        const [row] = rows;
        if (isWeekStartId(row.weekId)) continue;
        const candidates = getLegacyWeekStarts(row.weekId);
        if (candidates.length !== 1 || rows.length !== 1) {
          const reason = candidates.length === 0 ? 'unrecognized_key'
            : candidates.length > 1 ? 'ambiguous_week' : 'duplicate_legacy_rows';
          review.push({ table: table.name, rows, candidates, reason });
        } else if (groups.has(`${row.userId}:${candidates[0]}`)) {
          existing += 1;
        } else {
          eligible.push({ table, row, target: candidates[0] });
        }
      }
    }

    let copied = 0;
    if (apply) {
      for (const { table, row, target } of eligible) {
        const tableName = sql.identifier(table.name);
        const fields = sql.join([...table.fields, 'created_at', 'updated_at'].map(sql.identifier), sql`, `);
        copied += await db.transaction(async tx => {
          await lockWeekRecords(tx, row.userId, target);
          const result = await tx.execute(sql`
            insert into ${tableName} (user_id, week_id, ${fields})
            select user_id, ${target}, ${fields} from ${tableName}
            where id = ${row.id} and user_id = ${row.userId} and week_id = ${row.weekId}
              and (select count(*) from ${tableName} where user_id = ${row.userId} and week_id = ${row.weekId}) = 1
              and not exists (
                select 1 from ${tableName} where user_id = ${row.userId} and week_id = ${target}
              )
          `);
          return result.rowCount ?? 0;
        });
      }
    }

    console.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      eligible: eligible.length,
      copied,
      existing,
      skippedDuringApply: apply ? eligible.length - copied : 0,
      review,
    }, null, 2));
  } finally {
    await db.$client.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
