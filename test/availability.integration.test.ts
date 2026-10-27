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
let clubId: string;

before(async () => {
  const owner = await databasePool.query<{ id: string }>(
    "INSERT INTO users (telegram_id,role) VALUES ($1,'club_owner') RETURNING id::text",
    [`${Date.now()}${Math.floor(Math.random() * 1_000_000)}`],
  );
  ownerId = owner.rows[0].id;
  const club = await databasePool.query<{ id: string }>(
    `INSERT INTO game_clubs (owner_id,name,slug,address,location,status,working_hours)
     VALUES ($1,'Availability fixture',$2,'Tashkent',ST_SetSRID(ST_MakePoint(69.24,41.3),4326)::geography,
       'approved','{"mon":[{"open":"00:00","close":"00:00"}],"tue":[{"open":"00:00","close":"00:00"}],"wed":[{"open":"00:00","close":"00:00"}],"thu":[{"open":"00:00","close":"00:00"}],"fri":[{"open":"00:00","close":"00:00"}],"sat":[{"open":"00:00","close":"00:00"}],"sun":[{"open":"00:00","close":"00:00"}]}'::jsonb)
     RETURNING id::text`,
    [ownerId, `availability-${Date.now()}`],
  );
  clubId = club.rows[0].id;
  server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/clubs`;
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  if (clubId) await databasePool.query("DELETE FROM game_clubs WHERE id=$1", [clubId]);
  if (ownerId) await databasePool.query("DELETE FROM users WHERE id=$1", [ownerId]);
  await databasePool.end();
});

test("club availability exposes schedule state and never claims real-time occupancy", async () => {
  const response = await fetch(`${baseUrl}/${clubId}/availability`);
  assert.equal(response.status, 200);
  const body = await response.json() as { success: boolean; data: { isOpenNow: boolean; occupancy: string; timezone: string } };
  assert.equal(body.success, true);
  assert.equal(body.data.isOpenNow, true);
  assert.equal(body.data.occupancy, "unknown");
  assert.equal(body.data.timezone, "Asia/Tashkent");

  const hidden = await databasePool.query("UPDATE game_clubs SET status='pending' WHERE id=$1", [clubId]);
  assert.equal(hidden.rowCount, 1);
  assert.equal((await fetch(`${baseUrl}/${clubId}/availability`)).status, 404);
});
