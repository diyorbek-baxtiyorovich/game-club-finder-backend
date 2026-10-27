import { databasePool } from "../../config/database.js";

export interface NearbyClub {
  id: string;
  name: string;
  city: string | null;
  address: string;
  location: { lng: number; lat: number };
  distanceMeters: number | null;
  ratingAvg: number | null;
  coverImageUrl: string | null;
}

interface NearbyRow {
  id: string;
  name: string;
  city: string | null;
  address: string;
  lng: number;
  lat: number;
  distance_meters: number | null;
  rating_avg: string | null;
  cover_image_url: string | null;
}

function selectWithDistance(distanceExpression: string): string {
  return `SELECT c.id::text, c.name, c.city, c.address,
    ST_X(c.location::geometry) AS lng, ST_Y(c.location::geometry) AS lat,
    ${distanceExpression} AS distance_meters,
    (SELECT avg(CASE WHEN r.performance IS NULL THEN r.rating::numeric
      ELSE (r.performance + r.equipment + r.service + r.cleanliness + r.comfort + r.value_for_money)::numeric / 6 END)
     FROM club_ratings r WHERE r.club_id=c.id
       AND NOT EXISTS (SELECT 1 FROM reviews rv WHERE rv.club_id=r.club_id AND rv.user_id=r.user_id
         AND (rv.status <> 'approved' OR rv.is_flagged = true))) AS rating_avg,
    cover.image_url AS cover_image_url
    FROM game_clubs c
    LEFT JOIN LATERAL (
      SELECT image_url FROM club_images WHERE club_id = c.id
      ORDER BY CASE image_category WHEN 'cover' THEN 0 WHEN 'interior' THEN 1 ELSE 2 END,
        display_order, id LIMIT 1
    ) cover ON true`;
}

function mapRows(rows: NearbyRow[]): NearbyClub[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    address: row.address,
    location: { lng: Number(row.lng), lat: Number(row.lat) },
    distanceMeters:
      row.distance_meters === null ? null : Number(row.distance_meters),
    ratingAvg: row.rating_avg === null ? null : Number(row.rating_avg),
    coverImageUrl: row.cover_image_url,
  }));
}

export async function findNearbyByCoordinates(
  lat: number,
  lng: number,
  radiusMeters: number,
  page: number,
  limit: number,
): Promise<{ clubs: NearbyClub[]; total: number }> {
  const point = "ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography";
  const [result, count] = await Promise.all([
    databasePool.query<NearbyRow>(
      `${selectWithDistance("ST_Distance(c.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)::double precision")}
       WHERE c.status = 'approved' AND c.is_active = true
         AND ST_DWithin(c.location, ${point}, $3)
       ORDER BY distance_meters ASC, c.id ASC LIMIT $4 OFFSET $5`,
      [lng, lat, radiusMeters, limit, (page - 1) * limit],
    ),
    databasePool.query<{ total: string }>(
      `SELECT count(*)::text AS total FROM game_clubs c
       WHERE c.status = 'approved' AND c.is_active = true
         AND ST_DWithin(c.location, ${point}, $3)`,
      [lng, lat, radiusMeters],
    ),
  ]);
  return { clubs: mapRows(result.rows), total: Number(count.rows[0].total) };
}

export async function findNearbyByCity(
  city: string,
  page: number,
  limit: number,
): Promise<{ clubs: NearbyClub[]; total: number }> {
  const [result, count] = await Promise.all([
    databasePool.query<NearbyRow>(
      `${selectWithDistance("NULL::double precision")}
       WHERE c.status = 'approved' AND c.is_active = true AND lower(c.city) = lower($1)
       ORDER BY c.name ASC, c.id ASC LIMIT $2 OFFSET $3`,
      [city, limit, (page - 1) * limit],
    ),
    databasePool.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM game_clubs WHERE status = 'approved' AND is_active = true AND lower(city) = lower($1)",
      [city],
    ),
  ]);
  return { clubs: mapRows(result.rows), total: Number(count.rows[0].total) };
}
