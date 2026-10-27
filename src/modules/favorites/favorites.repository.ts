import { databasePool } from "../../config/database.js";
import type { FavoritesListQuery } from "./favorites.schema.js";

interface FavoriteRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  address: string;
  created_at: Date;
}

const visibleFavorite = `FROM favorites f JOIN game_clubs c ON c.id = f.club_id
  WHERE f.user_id = $1 AND c.status = 'approved' AND c.is_active = true`;

function toFavorite(row: FavoriteRow) {
  return {
    club: { id: row.id, name: row.name, slug: row.slug, city: row.city, address: row.address },
    favoritedAt: row.created_at.toISOString(),
  };
}

export async function listFavorites(userId: string, query: FavoritesListQuery) {
  const [items, count] = await Promise.all([
    databasePool.query<FavoriteRow>(
      `SELECT c.id::text, c.name, c.slug, c.city, c.address, f.created_at ${visibleFavorite}
       ORDER BY f.created_at DESC, f.id DESC LIMIT $2 OFFSET $3`,
      [userId, query.limit, (query.page - 1) * query.limit],
    ),
    databasePool.query<{ total: string }>(`SELECT count(*)::text AS total ${visibleFavorite}`, [userId]),
  ]);
  return { items: items.rows.map(toFavorite), total: Number(count.rows[0].total) };
}

export async function addFavorite(userId: string, clubId: string) {
  const inserted = await databasePool.query<{ created_at: Date }>(
    `INSERT INTO favorites (user_id, club_id)
     SELECT $1, c.id FROM game_clubs c
     WHERE c.id = $2 AND c.status = 'approved' AND c.is_active = true
     ON CONFLICT (user_id, club_id) DO NOTHING RETURNING created_at`,
    [userId, clubId],
  );
  const existing = await databasePool.query<FavoriteRow>(
    `SELECT c.id::text, c.name, c.slug, c.city, c.address, f.created_at ${visibleFavorite}
     AND f.club_id = $2`, [userId, clubId],
  );
  return existing.rows[0]
    ? { favorite: toFavorite(existing.rows[0]), created: inserted.rowCount === 1 }
    : null;
}

export async function removeFavorite(userId: string, clubId: string): Promise<boolean> {
  const result = await databasePool.query(
    "DELETE FROM favorites WHERE user_id = $1 AND club_id = $2", [userId, clubId],
  );
  return result.rowCount === 1;
}
