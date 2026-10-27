import { databasePool } from "../../config/database.js";
import type { Club } from "./club.schema.js";

export async function findPublicAvailability(clubId: string): Promise<{
  workingHours: Club["workingHours"];
  timezone: string;
} | null> {
  const result = await databasePool.query<{
    working_hours: Club["workingHours"];
    timezone: string;
  }>(
    `SELECT working_hours, timezone FROM game_clubs
     WHERE id=$1 AND status='approved' AND is_active=true`,
    [clubId],
  );
  const row = result.rows[0];
  return row ? { workingHours: row.working_hours, timezone: row.timezone } : null;
}
