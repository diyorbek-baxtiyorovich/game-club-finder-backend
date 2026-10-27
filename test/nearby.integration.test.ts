import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, test } from "node:test";

import { createApp } from "../src/app.js";
import { databasePool } from "../src/config/database.js";

let server: Server;
let baseUrl: string;
let ownerId: string;
const clubIds: string[] = [];

async function insertClub(options: {
  name: string;
  slug: string;
  city: string;
  lng: number;
  lat: number;
  status?: "approved" | "pending";
  active?: boolean;
}): Promise<string> {
  const result = await databasePool.query<{ id: string }>(
    `INSERT INTO game_clubs (owner_id, name, slug, city, address, location, status, is_active)
     VALUES ($1, $2, $3, $4, 'Test address', ST_SetSRID(ST_MakePoint($5, $6),4326)::geography, $7, $8)
     RETURNING id::text`,
    [
      ownerId,
      options.name,
      options.slug,
      options.city,
      options.lng,
      options.lat,
      options.status ?? "approved",
      options.active ?? true,
    ],
  );
  const id = result.rows[0].id;
  clubIds.push(id);
  return id;
}

async function getNearby(query: string): Promise<Response> {
  return fetch(`${baseUrl}/api/v1/clubs/nearby${query}`);
}

before(async () => {
  const telegramId = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  const owner = await databasePool.query<{ id: string }>(
    "INSERT INTO users (telegram_id, role) VALUES ($1, 'club_owner') RETURNING id::text",
    [telegramId],
  );
  ownerId = owner.rows[0].id;
  server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  if (ownerId) {
    if (clubIds.length)
      await databasePool.query(
        "DELETE FROM game_clubs WHERE id = ANY($1::bigint[])",
        [clubIds],
      );
    await databasePool.query("DELETE FROM users WHERE id = $1", [ownerId]);
  }
  await databasePool.end();
});

test("nearby uses PostGIS meters, public visibility, city mode, cover and validation", async () => {
  const closeId = await insertClub({
    name: "Nearby Close",
    slug: `nearby-close-${Date.now()}`,
    city: "Tashkent",
    lng: 69.2401,
    lat: 41.3,
  });
  const mediumId = await insertClub({
    name: "Nearby Medium",
    slug: `nearby-medium-${Date.now()}`,
    city: "Tashkent",
    lng: 69.2401,
    lat: 41.31,
  });
  const farId = await insertClub({
    name: "Nearby Far",
    slug: `nearby-far-${Date.now()}`,
    city: "Samarkand",
    lng: 69.2401,
    lat: 41.5,
  });
  const pendingId = await insertClub({
    name: "Nearby Pending",
    slug: `nearby-pending-${Date.now()}`,
    city: "Tashkent",
    lng: 69.2401,
    lat: 41.2995,
    status: "pending",
  });
  const inactiveId = await insertClub({
    name: "Nearby Inactive",
    slug: `nearby-inactive-${Date.now()}`,
    city: "Tashkent",
    lng: 69.2401,
    lat: 41.2995,
    active: false,
  });
  await databasePool.query(
    "INSERT INTO club_images (club_id, image_url, sort_order) VALUES ($1, 'https://example.com/nearby-cover.jpg', 0)",
    [closeId],
  );

  const gistIndex = await databasePool.query<{ indexdef: string }>(
    "SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'game_clubs'",
  );
  assert.ok(
    gistIndex.rows.some((row) =>
      /USING gist\s*\(location\)/i.test(row.indexdef),
    ),
  );

  const oneKm = await getNearby("?lat=41.2995&lng=69.2401&radius=1000");
  assert.equal(oneKm.status, 200);
  const oneKmData = (
    (await oneKm.json()) as {
      data: Array<{ id: string; distanceMeters: number }>;
    }
  ).data;
  assert.ok(oneKmData.some((club) => club.id === closeId));
  assert.equal(
    oneKmData.some((club) => club.id === mediumId),
    false,
  );
  assert.equal(
    oneKmData.some((club) => club.id === pendingId),
    false,
  );
  assert.equal(
    oneKmData.some((club) => club.id === inactiveId),
    false,
  );
  assert.ok(
    oneKmData.every(
      (club, index) =>
        index === 0 ||
        oneKmData[index - 1].distanceMeters <= club.distanceMeters,
    ),
  );

  const fiveKm = await getNearby("?lat=41.2995&lng=69.2401&radius=5000");
  const fiveKmData = ((await fiveKm.json()) as { data: Array<{ id: string }> })
    .data;
  assert.ok(fiveKmData.some((club) => club.id === closeId));
  assert.ok(fiveKmData.some((club) => club.id === mediumId));
  assert.equal(
    fiveKmData.some((club) => club.id === farId),
    false,
  );

  const tenKm = await getNearby("?lat=41.2995&lng=69.2401&radius=10000");
  const tenKmData = (
    (await tenKm.json()) as {
      data: Array<{
        id: string;
        distanceMeters: number;
        location: { lng: number; lat: number };
        ratingAvg: number | null;
        coverImageUrl: string | null;
      }>;
    }
  ).data;
  assert.ok(tenKmData.some((club) => club.id === closeId));
  assert.ok(tenKmData.some((club) => club.id === mediumId));
  assert.equal(
    tenKmData.some((club) => club.id === farId),
    false,
  );
  const close = tenKmData.find((club) => club.id === closeId)!;
  assert.equal(close.location.lng, 69.2401);
  assert.equal(close.location.lat, 41.3);
  assert.equal(close.coverImageUrl, "https://example.com/nearby-cover.jpg");
  assert.equal(
    close.ratingAvg,
    null,
    "ratings aggregate is not implemented yet",
  );

  const city = await getNearby("?city=Tashkent");
  assert.equal(city.status, 200);
  const cityData = (
    (await city.json()) as {
      data: Array<{ id: string; city: string; distanceMeters: number | null }>;
    }
  ).data;
  assert.ok(cityData.some((club) => club.id === closeId));
  assert.ok(
    cityData.every(
      (club) =>
        club.city.toLowerCase() === "tashkent" && club.distanceMeters === null,
    ),
  );
  assert.equal(
    cityData.some((club) => club.id === farId),
    false,
  );

  for (const query of [
    "?lat=91&lng=69&radius=1000",
    "?lat=41.3",
    "?lat=41&lng=69&radius=50001",
    "?lat=41&lng=69&city=Tashkent",
    "?radius=5000",
  ]) {
    assert.equal(
      (await getNearby(query)).status,
      400,
      `${query} should be rejected`,
    );
  }
});
