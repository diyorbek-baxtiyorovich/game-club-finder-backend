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
let secondOwnerId: string;
let userId: string;
let adminId: string;
let ownerToken: string;
let secondOwnerToken: string;
let userToken: string;
let adminToken: string;
const clubIds: string[] = [];

async function createUser(
  role: "user" | "club_owner" | "admin",
): Promise<string> {
  const telegramId = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  const result = await databasePool.query<{ id: string }>(
    "INSERT INTO users (telegram_id, role) VALUES ($1, $2) RETURNING id::text",
    [telegramId, role],
  );
  return result.rows[0].id;
}

async function request(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

async function createClub(slug: string): Promise<string> {
  const response = await request(
    "/api/v1/clubs",
    {
      method: "POST",
      body: JSON.stringify({
        name: `Moderation ${slug}`,
        slug,
        address: "Tashkent",
        location: { lng: 69.24, lat: 41.3 },
      }),
    },
    ownerToken,
  );
  assert.equal(response.status, 201);
  const id = ((await response.json()) as { data: { id: string } }).data.id;
  clubIds.push(id);
  return id;
}

before(async () => {
  assert.ok(
    env.jwtAccessSecret,
    "JWT_ACCESS_SECRET must be configured for the integration test",
  );
  ownerId = await createUser("club_owner");
  secondOwnerId = await createUser("club_owner");
  userId = await createUser("user");
  adminId = await createUser("admin");
  ownerToken = await signAccessToken(
    { id: ownerId, role: "club_owner" },
    env.jwtAccessSecret,
  );
  secondOwnerToken = await signAccessToken(
    { id: secondOwnerId, role: "club_owner" },
    env.jwtAccessSecret,
  );
  userToken = await signAccessToken(
    { id: userId, role: "user" },
    env.jwtAccessSecret,
  );
  adminToken = await signAccessToken(
    { id: adminId, role: "admin" },
    env.jwtAccessSecret,
  );
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
  if (ownerId && secondOwnerId && userId && adminId) {
    await databasePool.query(
      "DELETE FROM game_club_moderation_audit WHERE club_id = ANY($1::bigint[]) OR moderator_id = $2",
      [clubIds, adminId],
    );
    if (clubIds.length)
      await databasePool.query(
        "DELETE FROM game_clubs WHERE id = ANY($1::bigint[])",
        [clubIds],
      );
    await databasePool.query("DELETE FROM users WHERE id = ANY($1::bigint[])", [
      [ownerId, secondOwnerId, userId, adminId],
    ]);
  }
  await databasePool.end();
});

test("admin moderates pending clubs, audit is atomic and owners can see their own status", async () => {
  const suffix = `${Date.now()}`;
  const approvedClubId = await createClub(`moderation-approved-${suffix}`);
  const rejectedClubId = await createClub(`moderation-rejected-${suffix}`);

  assert.equal((await request(`/api/v1/admin/clubs/pending`)).status, 401);
  assert.equal(
    (await request("/api/v1/admin/clubs/pending", {}, userToken)).status,
    403,
  );
  const pending = await request("/api/v1/admin/clubs/pending", {}, adminToken);
  assert.equal(pending.status, 200);
  assert.ok(
    ((await pending.json()) as { data: Array<{ id: string }> }).data.some(
      (club) => club.id === approvedClubId,
    ),
  );

  const ownerStatus = await request(
    `/api/v1/clubs/${approvedClubId}/status`,
    {},
    ownerToken,
  );
  assert.equal(ownerStatus.status, 200);
  assert.equal(
    ((await ownerStatus.json()) as { data: { status: string } }).data.status,
    "pending",
  );
  assert.equal(
    (
      await request(
        `/api/v1/clubs/${approvedClubId}/status`,
        {},
        secondOwnerToken,
      )
    ).status,
    403,
  );
  assert.equal(
    (await request(`/api/v1/clubs/${approvedClubId}/status`, {}, userToken))
      .status,
    403,
  );

  const missingReason = await request(
    `/api/v1/admin/clubs/${rejectedClubId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "rejected" }),
    },
    adminToken,
  );
  assert.equal(missingReason.status, 400);
  const ordinaryModeration = await request(
    `/api/v1/admin/clubs/${approvedClubId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "approved" }),
    },
    userToken,
  );
  assert.equal(ordinaryModeration.status, 403);

  const approve = await request(
    `/api/v1/admin/clubs/${approvedClubId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "approved",
        reason: "Tekshiruvdan o‘tdi",
      }),
    },
    adminToken,
  );
  assert.equal(approve.status, 200);
  const reject = await request(
    `/api/v1/admin/clubs/${rejectedClubId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "rejected",
        reason: "Ma’lumotlar to‘liq emas",
      }),
    },
    adminToken,
  );
  assert.equal(reject.status, 200);

  const approvedPublic = await request(`/api/v1/clubs/${approvedClubId}`);
  const rejectedPublic = await request(`/api/v1/clubs/${rejectedClubId}`);
  assert.equal(approvedPublic.status, 200);
  assert.equal(rejectedPublic.status, 404);
  const rejectedOwnerStatus = await request(
    `/api/v1/clubs/${rejectedClubId}/status`,
    {},
    ownerToken,
  );
  const rejectedStatusData = (
    (await rejectedOwnerStatus.json()) as {
      data: { status: string; reason: string; reviewedAt: string };
    }
  ).data;
  assert.equal(rejectedStatusData.status, "rejected");
  assert.equal(rejectedStatusData.reason, "Ma’lumotlar to‘liq emas");
  assert.ok(rejectedStatusData.reviewedAt);

  const repeatedModeration = await request(
    `/api/v1/admin/clubs/${approvedClubId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "rejected", reason: "Boshqa natija" }),
    },
    adminToken,
  );
  assert.equal(repeatedModeration.status, 409);

  const audit = await databasePool.query<{
    moderator_id: string;
    old_status: string;
    new_status: string;
    reason: string;
  }>(
    "SELECT moderator_id::text, old_status, new_status, reason FROM game_club_moderation_audit WHERE club_id = $1",
    [rejectedClubId],
  );
  assert.equal(audit.rows.length, 1);
  assert.equal(audit.rows[0].moderator_id, adminId);
  assert.equal(audit.rows[0].old_status, "pending");
  assert.equal(audit.rows[0].new_status, "rejected");
  assert.equal(audit.rows[0].reason, "Ma’lumotlar to‘liq emas");
});
