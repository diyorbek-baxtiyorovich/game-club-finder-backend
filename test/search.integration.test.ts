import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { databasePool } from "../src/config/database.js";

let server: Server;
let baseUrl: string;
let ownerId: string;
let raterId: string;
let gameId: string;
let app: ReturnType<typeof createApp>;
const clubIds: string[] = [];

before(async () => {
  const telegramId = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  const owner = await databasePool.query<{ id: string }>(
    "INSERT INTO users (telegram_id, role) VALUES ($1, 'club_owner') RETURNING id::text",
    [telegramId],
  );
  ownerId = owner.rows[0].id;
  const rater = await databasePool.query<{ id: string }>(
    "INSERT INTO users (telegram_id, role) VALUES ($1, 'user') RETURNING id::text",
    [`${Date.now()}${Math.floor(Math.random() * 1_000_000)}`],
  );
  raterId = rater.rows[0].id;
  const game = await databasePool.query<{ id: string }>(
    "SELECT id::text FROM games WHERE slug='cs2' LIMIT 1",
  );
  assert.ok(game.rows[0], "seed game cs2 is required");
  gameId = game.rows[0].id;
  app = createApp();
  server = app.listen(0, "127.0.0.1");
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
  if (clubIds.length) {
    await databasePool.query(
      "DELETE FROM club_ratings WHERE club_id = ANY($1::bigint[])",
      [clubIds],
    );
    await databasePool.query(
      "DELETE FROM game_clubs WHERE id = ANY($1::bigint[])",
      [clubIds],
    );
  }
  if (raterId)
    await databasePool.query("DELETE FROM users WHERE id=$1", [raterId]);
  if (ownerId)
    await databasePool.query("DELETE FROM users WHERE id=$1", [ownerId]);
  await databasePool.end();
});

test("club search combines filters without duplicates and exposes only catalog-backed options", async () => {
  const fixtureName = `Search Fixture ${Date.now()}`;
  const club = await databasePool.query<{ id: string }>(
    `INSERT INTO game_clubs (owner_id,name,slug,city,address,location,status)
     VALUES ($1,$2,$3,'Tashkent','Search test address',ST_SetSRID(ST_MakePoint(69.24,41.3),4326)::geography,'approved') RETURNING id::text`,
    [ownerId, fixtureName, `search-fixture-${Date.now()}`],
  );
  const id = club.rows[0].id;
  clubIds.push(id);
  await databasePool.query(
    "INSERT INTO club_games (club_id,game_id) VALUES ($1,$2)",
    [id, gameId],
  );
  await databasePool.query(
    "INSERT INTO club_equipment (club_id,name,monitor_hz,ram_gb) VALUES ($1,'144 Hz fixture',144,16),($1,'240 Hz fixture',240,32)",
    [id],
  );
  await databasePool.query(
    "INSERT INTO club_features (club_id,category,name) VALUES ($1,'room_type','vip_zone'),($1,'room_type','bootcamp'),($1,'service','wifi'),($1,'service','parking')",
    [id],
  );
  await databasePool.query(
    "INSERT INTO club_pricing (club_id,category,name,hourly_price) VALUES ($1,'standard','fixture cheap',10000),($1,'vip','fixture premium',50000)",
    [id],
  );
  await databasePool.query(
    "INSERT INTO club_ratings (club_id,user_id,rating) VALUES ($1,$2,4),($1,$3,5)",
    [id, ownerId, raterId],
  );
  const local = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  const [currentHour, currentMinute] = local.split(":").map(Number);
  const currentMinutes = currentHour * 60 + currentMinute;
  const formatTime = (minutes: number) => {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
  };
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const hours = Object.fromEntries(
    days.map((day) => [
      day,
      [
        {
          open: formatTime(currentMinutes - 120),
          close: formatTime(currentMinutes + 120),
        },
      ],
    ]),
  );
  await databasePool.query(
    "UPDATE game_clubs SET working_hours=$2::jsonb WHERE id=$1",
    [id, JSON.stringify(hours)],
  );

  const listResponse = await fetch(
    `${baseUrl}/api/v1/clubs?q=${encodeURIComponent(fixtureName)}&city=tashkent&sort=name&limit=1`,
  );
  assert.equal(listResponse.status, 200);
  const listed = (await listResponse.json()) as {
    data: Array<{ id: string }>;
    meta: { total: number; limit: number };
  };
  assert.equal(listed.meta.total, 1);
  assert.equal(listed.meta.limit, 1);
  assert.equal(listed.data[0].id, id);

  const injectionAttempt = await fetch(`${baseUrl}/api/v1/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: `no-match%' OR 1=1 --` }),
  });
  assert.equal(injectionAttempt.status, 200);
  assert.equal(
    ((await injectionAttempt.json()) as { meta: { total: number } }).meta.total,
    0,
    "SQL-like search text must be treated as a bound value, not executable SQL",
  );

  const searchResponse = await fetch(`${baseUrl}/api/v1/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      q: fixtureName,
      city: "Tashkent",
      games: ["cs2", "dota2"],
      hardware: { screenHzMin: 144, ramGbMin: 16 },
      roomTypes: ["vip_zone", "bootcamp"],
      services: ["wifi", "parking"],
      price: { min: 10000, max: 50000 },
      page: 1,
      limit: 10,
      sort: "price_low",
    }),
  });
  assert.equal(searchResponse.status, 200);
  const searched = (await searchResponse.json()) as {
    data: Array<{
      id: string;
      minHourlyPrice: number | null;
      ratingAvg: number | null;
    }>;
    meta: { total: number };
  };
  assert.equal(searched.meta.total, 1);
  assert.equal(
    searched.data.length,
    1,
    "multiple matching child rows must not duplicate the club",
  );
  assert.equal(searched.data[0].id, id);
  assert.equal(searched.data[0].minHourlyPrice, 10000);
  assert.equal(searched.data[0].ratingAvg, 4.5);

  const supertestFiltered = await supertest(app)
    .post("/api/v1/search")
    .send({ q: fixtureName, city: "Tashkent", page: 1, limit: 10 });
  assert.equal(supertestFiltered.status, 200);
  assert.equal(supertestFiltered.body.meta.total, 1);
  assert.equal(supertestFiltered.body.data[0].id, id);

  const ratingBoundary = await fetch(`${baseUrl}/api/v1/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ratingMin: 4.5 }),
  });
  const ratingData = (await ratingBoundary.json()) as {
    data: Array<{ id: string; ratingAvg: number | null }>;
  };
  assert.ok(
    ratingData.data.some((item) => item.id === id && item.ratingAvg === 4.5),
  );
  const higherRating = await fetch(`${baseUrl}/api/v1/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ratingMin: 4.51 }),
  });
  assert.equal(
    ((await higherRating.json()) as { meta: { total: number } }).meta.total,
    0,
  );
  const openNow = await fetch(`${baseUrl}/api/v1/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ openNow: true }),
  });
  assert.ok(
    ((await openNow.json()) as { data: Array<{ id: string }> }).data.some(
      (item) => item.id === id,
    ),
  );
  const closedNow = await fetch(`${baseUrl}/api/v1/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ openNow: false }),
  });
  assert.equal(
    ((await closedNow.json()) as { data: Array<{ id: string }> }).data.some(
      (item) => item.id === id,
    ),
    false,
  );

  const insideRadius = await fetch(`${baseUrl}/api/v1/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      location: { lat: 41.3, lng: 69.24, radiusMeters: 1 },
      sort: "distance",
    }),
  });
  const insideData = (await insideRadius.json()) as {
    data: Array<{ id: string; distanceMeters: number | null }>;
    meta: { total: number };
  };
  assert.equal(insideRadius.status, 200);
  assert.ok(
    insideData.data.some((item) => item.id === id && item.distanceMeters === 0),
  );
  const outsideRadius = await fetch(`${baseUrl}/api/v1/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      location: { lat: 42, lng: 69.24, radiusMeters: 1 },
    }),
  });
  assert.equal(
    ((await outsideRadius.json()) as { meta: { total: number } }).meta.total,
    0,
  );

  const noPriceMatch = await fetch(`${baseUrl}/api/v1/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ price: { min: 10001, max: 49999 } }),
  });
  assert.equal(
    ((await noPriceMatch.json()) as { meta: { total: number } }).meta.total,
    0,
  );
  const noHzMatch = await fetch(`${baseUrl}/api/v1/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ hardware: { screenHzMin: 241 } }),
  });
  assert.equal(
    ((await noHzMatch.json()) as { meta: { total: number } }).meta.total,
    0,
  );

  const options = await fetch(`${baseUrl}/api/v1/filters/options`);
  assert.equal(options.status, 200);
  const optionData = (await options.json()) as {
    data: {
      games: Array<{ slug: string }>;
      roomTypes: string[];
      services: string[];
      ratings: { min: number; max: number };
      openNow: { defaultTimezone: string; basis: string };
    };
  };
  assert.ok(optionData.data.games.some((item) => item.slug === "cs2"));
  assert.ok(optionData.data.roomTypes.includes("vip_zone"));
  assert.ok(optionData.data.services.includes("wifi"));
  assert.deepEqual(optionData.data.ratings, { min: 1, max: 5 });
  assert.equal(optionData.data.openNow.defaultTimezone, "Asia/Tashkent");
  assert.equal(optionData.data.openNow.basis, "club timezone");

  for (const body of [{ price: { min: 50000, max: 10000 } }]) {
    const response = await fetch(`${baseUrl}/api/v1/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 400);
  }
});

test("openNow keeps every other filter (overnight branch) and q matches % and _ literally", async () => {
  // Every day 23:59 → 23:58 is an overnight interval, so "yesterday's" branch of
  // the openNow SQL matches at almost any time of day.
  const overnight = Object.fromEntries(
    ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => [day, [{ open: "23:59", close: "23:58" }]]),
  );
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const insert = async (name: string, city: string, status: string) => {
    const row = await databasePool.query<{ id: string }>(
      `INSERT INTO game_clubs (owner_id,name,slug,city,address,location,status,working_hours)
       VALUES ($1,$2,$3,$4,'Overnight test address',ST_SetSRID(ST_MakePoint(69.24,41.3),4326)::geography,$5,$6::jsonb)
       RETURNING id::text`,
      [ownerId, name, `overnight-${status}-${stamp}`, city, status, JSON.stringify(overnight)],
    );
    clubIds.push(row.rows[0].id);
    return row.rows[0].id;
  };
  const city = `OvernightCity${stamp}`;
  const pendingId = await insert(`Overnight pending ${stamp}`, city, "pending");
  const approvedId = await insert(`Overnight approved ${stamp}`, city, "approved");

  const search = async (body: object) => {
    const response = await fetch(`${baseUrl}/api/v1/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ limit: 100, ...body }),
    });
    assert.equal(response.status, 200);
    return (await response.json()) as { data: Array<{ id: string }>; meta: { total: number } };
  };

  const open = await search({ openNow: true, city });
  assert.deepEqual(open.data.map((club) => club.id), [approvedId]);
  assert.equal(open.meta.total, 1);
  assert.equal((await search({ openNow: true, city: `Elsewhere${stamp}` })).meta.total, 0);
  const closed = await search({ openNow: false, city });
  assert.equal(closed.data.some((club) => club.id === pendingId || club.id === approvedId), false);

  const percent = await fetch(`${baseUrl}/api/v1/clubs?q=${encodeURIComponent("%")}&city=${city}&limit=100`);
  assert.equal(percent.status, 200);
  assert.equal(((await percent.json()) as { meta: { total: number } }).meta.total, 0);
  assert.equal((await search({ q: "_", city })).meta.total, 0);
  // Sanity check: the approved club is reachable through q when the text really matches.
  assert.equal((await search({ q: "Overnight approved", city })).meta.total, 1);
});
