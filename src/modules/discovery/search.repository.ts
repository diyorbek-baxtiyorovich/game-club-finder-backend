import { databasePool } from "../../config/database.js";
import type { SearchBody } from "./search.schema.js";

export interface SearchClub {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  address: string;
  location: { lng: number; lat: number };
  distanceMeters: number | null;
  minHourlyPrice: number | null;
  ratingAvg: number | null;
}
interface SearchRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  address: string;
  lng: number;
  lat: number;
  distance_meters: number | null;
  min_hourly_price: string | null;
  rating_avg: string | null;
}

export const isOpenNowSql = `EXISTS (
  SELECT 1
  FROM jsonb_array_elements(COALESCE(c.working_hours -> (
    ARRAY['mon','tue','wed','thu','fri','sat','sun'])[EXTRACT(ISODOW FROM timezone('Asia/Tashkent', now()))::int],
    '[]'::jsonb)) AS current_interval(value)
  WHERE CASE
    WHEN current_interval.value->>'open' = '00:00' AND current_interval.value->>'close' = '00:00' THEN true
    WHEN (current_interval.value->>'close')::time > (current_interval.value->>'open')::time
      THEN timezone(c.timezone, now())::time >= (current_interval.value->>'open')::time
       AND timezone(c.timezone, now())::time < (current_interval.value->>'close')::time
    ELSE timezone(c.timezone, now())::time >= (current_interval.value->>'open')::time
  END
) OR EXISTS (
  SELECT 1
  FROM jsonb_array_elements(COALESCE(c.working_hours -> (
    ARRAY['mon','tue','wed','thu','fri','sat','sun'])[((EXTRACT(ISODOW FROM timezone('Asia/Tashkent', now()))::int + 5) % 7) + 1],
    '[]'::jsonb)) AS previous_interval(value)
  WHERE (previous_interval.value->>'close')::time < (previous_interval.value->>'open')::time
    AND timezone(c.timezone, now())::time < (previous_interval.value->>'close')::time
)`;

const publicRatingAverage = `(
  SELECT avg(CASE WHEN r.performance IS NULL THEN r.rating::numeric
    ELSE (r.performance + r.equipment + r.service + r.cleanliness + r.comfort + r.value_for_money)::numeric / 6 END)
  FROM club_ratings r WHERE r.club_id=c.id
    AND NOT EXISTS (SELECT 1 FROM reviews rv WHERE rv.club_id=r.club_id AND rv.user_id=r.user_id
      AND (rv.status <> 'approved' OR rv.is_flagged = true))
)`;

export async function searchClubs(
  filters: SearchBody,
): Promise<{ clubs: SearchClub[]; total: number }> {
  const params: unknown[] = [];
  const clauses = ["c.status = 'approved'", "c.is_active = true"];
  let pointExpression: string | null = null;
  const bind = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  if (filters.q) {
    const p = bind(`%${filters.q}%`);
    clauses.push(
      `(c.name ILIKE ${p} OR c.description ILIKE ${p} OR c.address ILIKE ${p})`,
    );
  }
  if (filters.city)
    clauses.push(`lower(c.city) = lower(${bind(filters.city)})`);
  if (filters.ratingMin !== undefined)
    clauses.push(`${publicRatingAverage} >= ${bind(filters.ratingMin)}`);
  if (filters.openNow !== undefined)
    clauses.push(filters.openNow ? isOpenNowSql : `NOT ${isOpenNowSql}`);
  if (filters.location) {
    pointExpression = `ST_SetSRID(ST_MakePoint(${bind(filters.location.lng)}, ${bind(filters.location.lat)}),4326)::geography`;
    clauses.push(
      `ST_DWithin(c.location, ${pointExpression}, ${bind(filters.location.radiusMeters)})`,
    );
  }
  if (filters.games?.length)
    clauses.push(
      `EXISTS (SELECT 1 FROM club_games cg JOIN games g ON g.id=cg.game_id WHERE cg.club_id=c.id AND g.slug = ANY(${bind(filters.games)}::text[]))`,
    );
  if (
    filters.hardware?.screenHzMin !== undefined ||
    filters.hardware?.ramGbMin !== undefined
  ) {
    const equipmentConditions = ["e.club_id=c.id"];
    if (filters.hardware.screenHzMin !== undefined)
      equipmentConditions.push(
        `e.monitor_hz >= ${bind(filters.hardware.screenHzMin)}`,
      );
    if (filters.hardware.ramGbMin !== undefined)
      equipmentConditions.push(
        `e.ram_gb >= ${bind(filters.hardware.ramGbMin)}`,
      );
    clauses.push(
      `EXISTS (SELECT 1 FROM club_equipment e WHERE ${equipmentConditions.join(" AND ")})`,
    );
  }
  if (filters.roomTypes?.length)
    clauses.push(
      `EXISTS (SELECT 1 FROM club_features f WHERE f.club_id=c.id AND f.category='room_type' AND f.name = ANY(${bind(filters.roomTypes)}::text[]))`,
    );
  if (filters.services?.length)
    clauses.push(
      `EXISTS (SELECT 1 FROM club_features f WHERE f.club_id=c.id AND f.category='service' AND f.name = ANY(${bind(filters.services)}::text[]))`,
    );
  if (filters.price?.min !== undefined)
    clauses.push(
      `EXISTS (SELECT 1 FROM club_pricing p WHERE p.club_id=c.id AND p.hourly_price >= ${bind(filters.price.min)}${filters.price.max === undefined ? "" : ` AND p.hourly_price <= ${bind(filters.price.max)}`})`,
    );
  else if (filters.price?.max !== undefined)
    clauses.push(
      `EXISTS (SELECT 1 FROM club_pricing p WHERE p.club_id=c.id AND p.hourly_price <= ${bind(filters.price.max)})`,
    );
  const where = clauses.join(" AND ");
  const order = {
    newest: "c.created_at DESC, c.id DESC",
    name: "c.name ASC, c.id ASC",
    price_low: "min_hourly_price ASC NULLS LAST, c.id ASC",
    price_high: "min_hourly_price DESC NULLS LAST, c.id ASC",
    distance: "distance_meters ASC, c.id ASC",
  }[filters.sort];
  const distance = pointExpression
    ? `ST_Distance(c.location, ${pointExpression})::double precision`
    : "NULL::double precision";
  const pagedParams = [
    ...params,
    filters.limit,
    (filters.page - 1) * filters.limit,
  ];
  const [rows, count] = await Promise.all([
    databasePool.query<SearchRow>(
      `SELECT c.id::text,c.name,c.slug,c.city,c.address,ST_X(c.location::geometry) lng,ST_Y(c.location::geometry) lat,${distance} distance_meters,(SELECT min(hourly_price)::text FROM club_pricing WHERE club_id=c.id) min_hourly_price,${publicRatingAverage}::text rating_avg FROM game_clubs c WHERE ${where} ORDER BY ${order} LIMIT $${pagedParams.length - 1} OFFSET $${pagedParams.length}`,
      pagedParams,
    ),
    databasePool.query<{ total: string }>(
      `SELECT count(*)::text total FROM game_clubs c WHERE ${where}`,
      params,
    ),
  ]);
  return {
    clubs: rows.rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      city: r.city,
      address: r.address,
      location: { lng: Number(r.lng), lat: Number(r.lat) },
      distanceMeters:
        r.distance_meters === null ? null : Number(r.distance_meters),
      minHourlyPrice:
        r.min_hourly_price === null ? null : Number(r.min_hourly_price),
      ratingAvg: r.rating_avg === null ? null : Number(r.rating_avg),
    })),
    total: Number(count.rows[0].total),
  };
}

export async function getFilterOptions() {
  const [games, roomTypes, services, hardware, price] = await Promise.all([
    databasePool.query("SELECT slug,name FROM games ORDER BY sort_order,name"),
    databasePool.query(
      "SELECT DISTINCT f.name FROM club_features f JOIN game_clubs c ON c.id=f.club_id WHERE f.category='room_type' AND c.status='approved' AND c.is_active=true ORDER BY f.name",
    ),
    databasePool.query(
      "SELECT DISTINCT f.name FROM club_features f JOIN game_clubs c ON c.id=f.club_id WHERE f.category='service' AND c.status='approved' AND c.is_active=true ORDER BY f.name",
    ),
    databasePool.query(
      "SELECT min(e.monitor_hz)::int AS min_hz,max(e.monitor_hz)::int AS max_hz,min(e.ram_gb)::int AS min_ram_gb,max(e.ram_gb)::int AS max_ram_gb FROM club_equipment e JOIN game_clubs c ON c.id=e.club_id WHERE c.status='approved' AND c.is_active=true",
    ),
    databasePool.query(
      "SELECT min(p.hourly_price)::float AS min,max(p.hourly_price)::float AS max FROM club_pricing p JOIN game_clubs c ON c.id=p.club_id WHERE c.status='approved' AND c.is_active=true",
    ),
  ]);
  return {
    games: games.rows,
    roomTypes: roomTypes.rows.map((r) => r.name),
    services: services.rows.map((r) => r.name),
    hardware: hardware.rows[0],
    price: price.rows[0],
    ratings: { min: 1, max: 5 },
    openNow: { defaultTimezone: "Asia/Tashkent", basis: "club timezone" },
  };
}
