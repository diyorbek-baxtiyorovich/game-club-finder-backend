import type { PoolClient } from "pg";
import { AppError } from "../../common/errors/app-error.js";
import { databasePool } from "../../config/database.js";
import type {
  Club,
  ClubEquipment,
  ClubFeature,
  ClubImage,
  ClubPricing,
} from "./club.schema.js";
import type { ClubInput } from "./club.schema.js";
import type { ClubListQuery } from "./club.schema.js";

interface ClubRow {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  city: string | null;
  lng: number;
  lat: number;
  status: Club["status"];
  created_at: Date;
  updated_at: Date;
  working_hours: Club["workingHours"];
  timezone: string;
}

const publicColumns = `id::text, owner_id::text, name, slug, description, address, city,
  ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat, status, created_at, updated_at, working_hours, timezone`;

async function getClubDetails(
  client: PoolClient,
  clubId: string,
  row: ClubRow,
): Promise<Club> {
  const equipment = await client.query<{
    id: string;
    name: string;
    monitor_hz: number | null;
    cpu: string | null;
    gpu: string | null;
    ram_gb: number | null;
  }>(
    "SELECT id::text, name, monitor_hz, cpu, gpu, ram_gb FROM club_equipment WHERE club_id = $1 ORDER BY id",
    [clubId],
  );
  const features = await client.query<{
    id: string;
    category: ClubFeature["category"];
    name: string;
  }>(
    "SELECT id::text, category, name FROM club_features WHERE club_id = $1 ORDER BY category, name",
    [clubId],
  );
  const pricing = await client.query<{
    id: string;
    category: ClubPricing["category"];
    name: string;
    hourly_price: string;
    discount_percent: string | null;
    currency: string;
  }>(
    "SELECT id::text, category, name, hourly_price::text, discount_percent::text, currency FROM club_pricing WHERE club_id = $1 ORDER BY category, id",
    [clubId],
  );
  const images = await client.query<{
    id: string;
    image_url: string;
    alt_text: string | null;
    sort_order: number;
    image_category: ClubImage["category"];
    display_order: number;
    mime_type: string | null;
    size_bytes: number | null;
  }>(
    "SELECT id::text, image_url, alt_text, sort_order, image_category, display_order, mime_type, size_bytes FROM club_images WHERE club_id = $1 ORDER BY display_order, sort_order, id",
    [clubId],
  );
  const games = await client.query<{ id: string; slug: string; name: string }>(
    `SELECT g.id::text, g.slug, g.name FROM club_games cg JOIN games g ON g.id = cg.game_id
     WHERE cg.club_id = $1 ORDER BY g.sort_order, g.name`,
    [clubId],
  );
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    address: row.address,
    city: row.city,
    location: { lng: Number(row.lng), lat: Number(row.lat) },
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    equipment: equipment.rows.map(
      (item): ClubEquipment => ({
        id: item.id,
        name: item.name,
        monitorHz: item.monitor_hz,
        cpu: item.cpu,
        gpu: item.gpu,
        ramGb: item.ram_gb,
      }),
    ),
    features: features.rows,
    pricing: pricing.rows.map(
      (item): ClubPricing => ({
        id: item.id,
        category: item.category,
        name: item.name,
        hourlyPrice: Number(item.hourly_price),
        discountPercent:
          item.discount_percent === null ? null : Number(item.discount_percent),
        currency: item.currency.trim(),
      }),
    ),
    images: images.rows.map(
      (item): ClubImage => ({
        id: item.id,
        imageUrl: item.image_url,
        altText: item.alt_text,
        sortOrder: item.sort_order,
        category: item.image_category,
        displayOrder: item.display_order,
        mimeType: item.mime_type,
        sizeBytes: item.size_bytes,
      }),
    ),
    games: games.rows,
    workingHours: row.working_hours,
    timezone: row.timezone,
  };
}

async function transaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
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

export async function listPublicClubs(
  query: ClubListQuery,
): Promise<{ clubs: Club[]; total: number }> {
  const values: unknown[] = [];
  const predicates = ["status = 'approved'", "is_active = true"];
  if (query.q) {
    values.push(`%${query.q}%`);
    predicates.push(
      `(name ILIKE $${values.length} OR description ILIKE $${values.length} OR address ILIKE $${values.length})`,
    );
  }
  if (query.city) {
    values.push(query.city);
    predicates.push(`lower(city) = lower($${values.length})`);
  }
  const where = predicates.join(" AND ");
  const orderBy = {
    newest: "created_at DESC, id DESC",
    name: "name ASC, id ASC",
    price_low:
      "(SELECT min(hourly_price) FROM club_pricing WHERE club_id = game_clubs.id) ASC NULLS LAST, id ASC",
    price_high:
      "(SELECT min(hourly_price) FROM club_pricing WHERE club_id = game_clubs.id) DESC NULLS LAST, id ASC",
  }[query.sort];
  const limitIndex = values.push(query.limit);
  const offsetIndex = values.push((query.page - 1) * query.limit);
  const [result, countResult] = await Promise.all([
    databasePool.query<ClubRow>(
      `SELECT ${publicColumns} FROM game_clubs WHERE ${where}
       ORDER BY ${orderBy} LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      values,
    ),
    databasePool.query<{ total: string }>(
      `SELECT count(*)::text AS total FROM game_clubs WHERE ${where}`,
      values.slice(0, values.length - 2),
    ),
  ]);
  return {
    clubs: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      address: row.address,
      city: row.city,
      location: { lng: Number(row.lng), lat: Number(row.lat) },
      status: row.status,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      equipment: [],
      features: [],
      pricing: [],
      images: [],
      games: [],
      workingHours: row.working_hours,
      timezone: row.timezone,
    })),
    total: Number(countResult.rows[0].total),
  };
}

export async function findPublicClub(id: string): Promise<Club | null> {
  return transaction(async (client) => {
    const result = await client.query<ClubRow>(
      `SELECT ${publicColumns} FROM game_clubs WHERE id = $1 AND status = 'approved' AND is_active = true`,
      [id],
    );
    return result.rows[0] ? getClubDetails(client, id, result.rows[0]) : null;
  });
}

export async function findClubOwner(id: string): Promise<string | null> {
  const result = await databasePool.query<{ owner_id: string }>(
    "SELECT owner_id::text FROM game_clubs WHERE id = $1 AND is_active = true",
    [id],
  );
  return result.rows[0]?.owner_id ?? null;
}

async function replaceRows(
  client: PoolClient,
  table: string,
  clubId: string,
  columns: string[],
  rows: unknown[][],
  removedStorageKeys: string[],
): Promise<void> {
  if (table === "club_images") {
    const removed = await client.query<{ storage_key: string | null }>(
      "DELETE FROM club_images WHERE club_id=$1 RETURNING storage_key", [clubId],
    );
    removedStorageKeys.push(...removed.rows.flatMap((row) => row.storage_key ? [row.storage_key] : []));
  } else {
    await client.query(`DELETE FROM ${table} WHERE club_id = $1`, [clubId]);
  }
  if (rows.length === 0) return;
  const values: unknown[] = [];
  const tuples = rows.map((row) => {
    const all = [clubId, ...row];
    const placeholders = all.map((value) => {
      values.push(value);
      return `$${values.length}`;
    });
    return `(${placeholders.join(", ")})`;
  });
  await client.query(
    `INSERT INTO ${table} (club_id, ${columns.join(", ")}) VALUES ${tuples.join(", ")}`,
    values,
  );
}

async function replaceProfile(
  client: PoolClient,
  clubId: string,
  input: Partial<ClubInput>,
  removedStorageKeys: string[],
): Promise<void> {
  if (input.equipment !== undefined)
    await replaceRows(
      client,
      "club_equipment",
      clubId,
      ["name", "monitor_hz", "cpu", "gpu", "ram_gb"],
      input.equipment.map((item) => [
        item.name,
        item.monitorHz ?? null,
        item.cpu ?? null,
        item.gpu ?? null,
        item.ramGb ?? null,
      ]),
      removedStorageKeys,
    );
  if (input.features !== undefined)
    await replaceRows(
      client,
      "club_features",
      clubId,
      ["category", "name"],
      input.features.map((item) => [item.category, item.name]),
      removedStorageKeys,
    );
  if (input.pricing !== undefined)
    await replaceRows(
      client,
      "club_pricing",
      clubId,
      ["category", "name", "hourly_price", "discount_percent", "currency"],
      input.pricing.map((item) => [
        item.category,
        item.name,
        item.hourlyPrice,
        item.discountPercent ?? null,
        item.currency,
      ]),
      removedStorageKeys,
    );
  if (input.images !== undefined)
    await replaceRows(
      client,
      "club_images",
      clubId,
      ["image_url", "alt_text", "sort_order", "display_order"],
      input.images.map((item) => [
        item.imageUrl,
        item.altText ?? null,
        item.sortOrder,
        item.sortOrder,
      ]),
      removedStorageKeys,
    );
  if (input.gameIds !== undefined) {
    const found = await client.query<{ id: string }>(
      "SELECT id::text FROM games WHERE id = ANY($1::bigint[])",
      [input.gameIds],
    );
    if (found.rowCount !== input.gameIds.length)
      throw new AppError(
        400,
        "INVALID_GAME_ID",
        "Bir yoki bir nechta o‘yin IDsi mavjud emas.",
      );
    await replaceRows(
      client,
      "club_games",
      clubId,
      ["game_id"],
      input.gameIds.map((id) => [id]),
      removedStorageKeys,
    );
  }
}

export async function insertClubProfile(
  ownerId: string,
  input: ClubInput,
): Promise<Club> {
  return transaction(async (client) => {
    await client.query("SELECT set_config('app.actor_user_id', $1, true)", [ownerId]);
    const result = await client.query<ClubRow>(
      `INSERT INTO game_clubs (owner_id, name, slug, description, address, city, location, working_hours, timezone)
       VALUES ($1,$2,$3,$4,$5,$6,ST_SetSRID(ST_MakePoint($7,$8),4326)::geography,$9::jsonb,$10)
       RETURNING ${publicColumns}`,
      [
        ownerId,
        input.name,
        input.slug,
        input.description ?? null,
        input.address,
        input.city ?? null,
        input.location.lng,
        input.location.lat,
        JSON.stringify(input.workingHours ?? {}),
        input.timezone ?? "Asia/Tashkent",
      ],
    );
    const row = result.rows[0];
    await replaceProfile(client, row.id, input, []);
    return getClubDetails(client, row.id, row);
  });
}

export async function updateClubProfile(
  id: string,
  actorId: string,
  input: Partial<ClubInput>,
): Promise<Club> {
  const removedStorageKeys: string[] = [];
  const updated = await transaction(async (client) => {
    await client.query("SELECT set_config('app.actor_user_id', $1, true)", [actorId]);
    const fields: string[] = [];
    const values: unknown[] = [id];
    const add = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };
    if (input.name !== undefined) add("name", input.name);
    if (input.slug !== undefined) add("slug", input.slug);
    if (input.description !== undefined) add("description", input.description);
    if (input.address !== undefined) add("address", input.address);
    if (input.city !== undefined) add("city", input.city);
    if (input.location !== undefined) {
      values.push(input.location.lng, input.location.lat);
      fields.push(
        `location = ST_SetSRID(ST_MakePoint($${values.length - 1}, $${values.length}), 4326)::geography`,
      );
    }
    if (input.workingHours !== undefined)
      add("working_hours", JSON.stringify(input.workingHours));
    if (input.timezone !== undefined) add("timezone", input.timezone);
    fields.push("updated_at = current_timestamp");

    const result = await client.query<ClubRow>(
      `UPDATE game_clubs SET ${fields.join(", ")} WHERE id = $1 AND is_active = true RETURNING ${publicColumns}`,
      values,
    );

    if (!result.rows[0])
      throw new AppError(404, "CLUB_NOT_FOUND", "Klub topilmadi.");
    await replaceProfile(client, id, input, removedStorageKeys);
    return getClubDetails(client, id, result.rows[0]);
  });
  const { objectStorage } = await import("../../integrations/storage/local-file-storage.js");
  await Promise.all(removedStorageKeys.map((key) => objectStorage.delete(key).catch(() => undefined)));
  return updated;
}

export async function softDeleteClub(id: string, actorId: string): Promise<void> {
  await transaction(async (client) => {
    await client.query("SELECT set_config('app.actor_user_id', $1, true)", [actorId]);
    await client.query(
      "UPDATE game_clubs SET is_active = false, updated_at = current_timestamp WHERE id = $1 AND is_active = true",
      [id],
    );
  });
}
