import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { databasePool } from "../src/config/database.js";
import { env } from "../src/config/env.js";
import { signAccessToken } from "../src/modules/auth/jwt.service.js";

let server: Server;
let baseUrl: string;
let ownerId: string;
let otherOwnerId: string;
let adminId: string;
let viewerId: string;
let ownerToken: string;
let otherOwnerToken: string;
let adminToken: string;
let userToken: string;
let clubId: string;

async function createUser(
  role: "user" | "club_owner" | "admin",
): Promise<string> {
  const result = await databasePool.query<{ id: string }>(
    "INSERT INTO users (telegram_id,role) VALUES ($1,$2) RETURNING id::text",
    [`${Date.now()}${Math.floor(Math.random() * 1_000_000)}`, role],
  );
  return result.rows[0].id;
}

async function request(
  path: string,
  method = "GET",
  token?: string,
  body?: unknown,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

before(async () => {
  ownerId = await createUser("club_owner");
  otherOwnerId = await createUser("club_owner");
  adminId = await createUser("admin");
  viewerId = await createUser("user");
  ownerToken = await signAccessToken(
    { id: ownerId, role: "club_owner" },
    env.jwtAccessSecret!,
  );
  otherOwnerToken = await signAccessToken(
    { id: otherOwnerId, role: "club_owner" },
    env.jwtAccessSecret!,
  );
  adminToken = await signAccessToken(
    { id: adminId, role: "admin" },
    env.jwtAccessSecret!,
  );
  userToken = await signAccessToken(
    { id: viewerId, role: "user" },
    env.jwtAccessSecret!,
  );
  server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  if (clubId) {
    await databasePool.query(
      "DELETE FROM game_club_moderation_audit WHERE club_id=$1",
      [clubId],
    );
    await databasePool.query("DELETE FROM reviews WHERE club_id=$1", [clubId]);
    await databasePool.query("DELETE FROM club_ratings WHERE club_id=$1", [
      clubId,
    ]);
    await databasePool.query("DELETE FROM view_history WHERE club_id=$1", [
      clubId,
    ]);
    await databasePool.query("DELETE FROM favorites WHERE club_id=$1", [
      clubId,
    ]);
    await databasePool.query("DELETE FROM game_clubs WHERE id=$1", [clubId]);
  }
  const userIds = [ownerId, otherOwnerId, adminId, viewerId].filter(Boolean);
  if (userIds.length)
    await databasePool.query("DELETE FROM users WHERE id=ANY($1::bigint[])", [
      userIds,
    ]);
  await databasePool.end();
});

test("statistics are role-protected, calculated from source tables, and audit events are append-only", async () => {
  const create = await request("/clubs", "POST", ownerToken, {
    name: "Statistics fixture",
    slug: `statistics-${Date.now()}`,
    address: "Tashkent",
    location: { lng: 69.24, lat: 41.3 },
  });
  assert.equal(create.status, 201);
  clubId = ((await create.json()) as { data: { id: string } }).data.id;

  assert.equal((await request(`/clubs/${clubId}/stats`)).status, 401);
  assert.equal(
    (await request(`/clubs/${clubId}/stats`, "GET", userToken)).status,
    403,
  );
  assert.equal(
    (await request(`/clubs/${clubId}/stats`, "GET", otherOwnerToken)).status,
    403,
  );

  const renamed = await request(`/clubs/${clubId}`, "PUT", ownerToken, {
    name: "Statistics fixture renamed",
  });
  assert.equal(renamed.status, 200);
  const approved = await request(
    `/admin/clubs/${clubId}/status`,
    "PATCH",
    adminToken,
    { status: "approved" },
  );
  assert.equal(approved.status, 200);

  await databasePool.query(
    "INSERT INTO view_history (user_id,club_id,view_count) VALUES ($1,$2,3)",
    [viewerId, clubId],
  );
  await databasePool.query(
    "INSERT INTO favorites (user_id,club_id) VALUES ($1,$2)",
    [viewerId, clubId],
  );
  await databasePool.query(
    "INSERT INTO club_ratings (club_id,user_id,rating) VALUES ($1,$2,4)",
    [clubId, viewerId],
  );

  const ownerStatsResponse = await request(
    `/clubs/${clubId}/stats`,
    "GET",
    ownerToken,
  );
  assert.equal(ownerStatsResponse.status, 200);
  const ownerStats = (
    (await ownerStatsResponse.json()) as { data: Record<string, number | null> }
  ).data;
  assert.equal(ownerStats.storedHistoryViewCount, 3);
  assert.equal(ownerStats.storedHistoryViewerCount, 1);
  assert.equal(ownerStats.favoriteCount, 1);
  assert.equal(ownerStats.ratingCount, 1);
  assert.equal(ownerStats.ratingAvg, 4);

  const adminStatsResponse = await request("/admin/stats", "GET", adminToken);
  assert.equal(adminStatsResponse.status, 200);
  const adminStats = (
    (await adminStatsResponse.json()) as {
      data: {
        clubs: { pending: number; approved: number; newLast30Days: number };
        users: { total: number; activeLast30Days: number };
        usage: { storedHistoryViewCount: number };
      };
    }
  ).data;
  assert.ok(adminStats.clubs.approved >= 1);
  assert.ok(adminStats.clubs.newLast30Days >= 1);
  assert.ok(adminStats.users.total >= 4);
  assert.ok(adminStats.users.activeLast30Days >= 1);
  assert.ok(adminStats.usage.storedHistoryViewCount >= 3);
  assert.equal((await request("/admin/stats", "GET", userToken)).status, 403);

  const auditResponse = await request(
    "/admin/audit?limit=100",
    "GET",
    adminToken,
  );
  assert.equal(auditResponse.status, 200);
  const auditEvents = (
    (await auditResponse.json()) as {
      data: Array<{
        actorId: string | null;
        entityId: string;
        action: string;
        changedFields: string[];
        metadata: Record<string, unknown>;
      }>;
    }
  ).data;
  const clubUpdate = auditEvents.find(
    (event) => event.entityId === clubId && event.action === "club.updated",
  );
  const clubModeration = auditEvents.find(
    (event) =>
      event.entityId === clubId && event.action === "club.status_changed",
  );
  assert.equal(clubUpdate?.actorId, ownerId);
  assert.deepEqual(clubUpdate?.changedFields, ["name"]);
  assert.equal(clubModeration?.actorId, adminId);
  assert.deepEqual(clubModeration?.metadata, {
    oldStatus: "pending",
    newStatus: "approved",
  });
  assert.equal((await request("/admin/audit", "GET", userToken)).status, 403);

  const roleChangeClient = await databasePool.connect();
  try {
    await roleChangeClient.query("BEGIN");
    await roleChangeClient.query(
      "SELECT set_config('app.actor_user_id',$1,true)",
      [adminId],
    );
    await roleChangeClient.query("UPDATE users SET role='admin' WHERE id=$1", [
      viewerId,
    ]);
    await roleChangeClient.query("COMMIT");
  } catch (error) {
    await roleChangeClient.query("ROLLBACK");
    throw error;
  } finally {
    roleChangeClient.release();
  }
  const roleAudit = await databasePool.query<{
    actor_id: string;
    metadata: Record<string, string>;
  }>(
    "SELECT actor_id::text,metadata FROM audit_events WHERE entity_type='user' AND entity_id=$1 ORDER BY id DESC LIMIT 1",
    [viewerId],
  );
  assert.equal(roleAudit.rows[0].actor_id, adminId);
  assert.deepEqual(roleAudit.rows[0].metadata, {
    oldRole: "user",
    newRole: "admin",
  });

  const immutable = await databasePool.query<{ id: string }>(
    "SELECT id::text FROM audit_events WHERE entity_id=$1 ORDER BY id DESC LIMIT 1",
    [clubId],
  );
  await assert.rejects(
    databasePool.query("DELETE FROM audit_events WHERE id=$1", [
      immutable.rows[0].id,
    ]),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "55000",
  );
});

test("audit list is ordered by numeric id, also across a digit-count boundary", async () => {
  // Push the id sequence just below the next power of ten so new ids go
  // e.g. 999 → 1000 → 1001. Sorting the ::text id would put "999" first.
  const current = await databasePool.query<{ max: string | null }>("SELECT max(id)::text max FROM audit_events");
  const next = 10 ** String(Number(current.rows[0].max ?? "0") + 2).length;
  await databasePool.query("SELECT setval(pg_get_serial_sequence('audit_events','id'), $1)", [next - 2]);
  const inserted = await databasePool.query<{ id: string }>(
    `INSERT INTO audit_events (actor_id,entity_type,entity_id,action)
     SELECT $1,'club','audit-order-test','club.updated' FROM generate_series(1,3) RETURNING id::text`,
    [adminId],
  );
  const insertedIds = inserted.rows.map((row) => row.id);

  const response = await request("/admin/audit?limit=100", "GET", adminToken);
  assert.equal(response.status, 200);
  const ids = ((await response.json()) as { data: Array<{ id: string }> }).data.map((event) => BigInt(event.id));
  for (let index = 1; index < ids.length; index += 1) {
    assert.ok(ids[index - 1] > ids[index], `audit ids must be numerically descending: ${ids[index - 1]} before ${ids[index]}`);
  }
  for (const id of insertedIds) assert.ok(ids.includes(BigInt(id)), `new audit event ${id} must be listed`);
});
