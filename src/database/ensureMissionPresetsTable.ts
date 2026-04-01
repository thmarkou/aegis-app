import type { Database } from '@nozbe/watermelondb';
import type { UnsafeExecuteOperations } from '@nozbe/watermelondb/adapters/type';

/**
 * Watermelon can report schema version "ok" while `mission_presets` is missing. Migrations then
 * never run again. DDL matches encodeCreateTable + indices.
 *
 * IMPORTANT: use `sqlString` (→ sqlite3_exec), not `sqls` (→ batch → prepareQuery). DDL in batch
 * can fail or not persist as expected on JSI.
 */
const MISSION_PRESETS_DDL = `
create table if not exists "mission_presets" ("id" primary key, "_changed", "_status", "name", "duration_days", "calories_per_day", "water_liters_per_day", "created_at", "updated_at");
create index if not exists "mission_presets_name" on "mission_presets" ("name");
create index if not exists "mission_presets__status" on "mission_presets" ("_status");
`;

export async function ensureMissionPresetsTable(db: Database): Promise<void> {
  await db.adapter.unsafeExecute({
    sqlString: MISSION_PRESETS_DDL.trim(),
  } as unknown as UnsafeExecuteOperations);
}
