import { databasePool } from "../../config/database.js";
import type { PoolClient } from "pg";
import type { HistoryListQuery } from "./history.schema.js";

interface HistoryRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  address: string;
  first_viewed_at: Date;
  last_viewed_at: Date;
  view_count: number;
}

const visibleHistory = `FROM view_history h JOIN game_clubs c ON c.id = h.club_id
  WHERE h.user_id = $1 AND c.status = 'approved' AND c.is_active = true`;

async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function prune(client: PoolClient, userId: string): Promise<void> {
  await client.query(
    "DELETE FROM view_history WHERE user_id = $1 AND last_viewed_at < current_timestamp - interval '90 days'",
    [userId],
  );
  await client.query(
    `DELETE FROM view_history WHERE user_id = $1 AND id IN (
       SELECT id FROM view_history WHERE user_id = $1
       ORDER BY last_viewed_at DESC, id DESC OFFSET 100
     )`, [userId],
  );
}

export async function recordView(userId: string, clubId: string): Promise<void> {
  await transaction(async (client) => {
    // One user's concurrent requests serialize before upsert and retention cleanup.
    await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);
    await client.query(
      `INSERT INTO view_history (user_id, club_id) VALUES ($1, $2)
       ON CONFLICT (user_id, club_id) DO UPDATE
       SET last_viewed_at = current_timestamp, view_count = view_history.view_count + 1`,
      [userId, clubId],
    );
    await prune(client, userId);
  });
}

export async function listHistory(userId: string, query: HistoryListQuery) {
  return transaction(async (client) => {
    await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);
    await prune(client, userId);
    const items = await client.query<HistoryRow>(
      `SELECT c.id::text, c.name, c.slug, c.city, c.address,
              h.first_viewed_at, h.last_viewed_at, h.view_count ${visibleHistory}
       ORDER BY h.last_viewed_at DESC, h.id DESC LIMIT $2 OFFSET $3`,
      [userId, query.limit, (query.page - 1) * query.limit],
    );
    const count = await client.query<{ total: string }>(
      `SELECT count(*)::text AS total ${visibleHistory}`, [userId],
    );
    return {
      items: items.rows.map((row) => ({
        club: { id: row.id, name: row.name, slug: row.slug, city: row.city, address: row.address },
        firstViewedAt: row.first_viewed_at.toISOString(),
        lastViewedAt: row.last_viewed_at.toISOString(),
        viewCount: row.view_count,
      })),
      total: Number(count.rows[0].total),
    };
  });
}
