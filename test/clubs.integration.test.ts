import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import supertest from "supertest";

import { createApp } from "../src/app.js";
import { databasePool } from "../src/config/database.js";
import { env } from "../src/config/env.js";
import { signAccessToken } from "../src/modules/auth/jwt.service.js";

let app: ReturnType<typeof createApp>;
let ownerId: string;
let secondOwnerId: string;
let userId: string;
let ownerToken: string;
let secondOwnerToken: string;
let userToken: string;

async function createUser(role: "user" | "club_owner"): Promise<string> {
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
  const method = (options.method ?? "GET").toLowerCase() as
    | "get"
    | "post"
    | "put"
    | "delete";
  let testRequest = supertest(app)[method](`/api/v1/clubs${path}`);
  if (token) testRequest = testRequest.set("authorization", `Bearer ${token}`);
  if (options.body) {
    testRequest = testRequest
      .set("content-type", "application/json")
      .send(options.body as string);
  }
  for (const [name, value] of Object.entries(options.headers ?? {})) {
    testRequest = testRequest.set(name, String(value));
  }
  const response = await testRequest;
  return {
    status: response.status,
    json: async () => response.body,
  } as unknown as Response;
}

before(async () => {
  assert.ok(
    env.jwtAccessSecret,
    "JWT_ACCESS_SECRET must be configured for the integration test",
  );
  ownerId = await createUser("club_owner");
  secondOwnerId = await createUser("club_owner");
  userId = await createUser("user");
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
  app = createApp();
});

after(async () => {
  if (ownerId && secondOwnerId && userId) {
    await databasePool.query(
      "DELETE FROM game_clubs WHERE owner_id = ANY($1::bigint[])",
      [[ownerId, secondOwnerId, userId]],
    );
    await databasePool.query("DELETE FROM users WHERE id = ANY($1::bigint[])", [
      [ownerId, secondOwnerId, userId],
    ]);
  }
  await databasePool.end();
});

test("club CRUD enforces ownership, visibility, unique slugs, coordinates and soft deletion", async () => {
  const gameResult = await databasePool.query<{ id: string }>(
    "SELECT id::text FROM games ORDER BY id LIMIT 1",
  );
  assert.ok(gameResult.rows[0], "at least one seeded game is required");
  const payload = {
    name: "Integration Gaming Club",
    slug: `integration-${Date.now()}`,
    description: "Temporary integration fixture",
    address: "Tashkent",
    location: { lng: 69.2401, lat: 41.2995 },
    equipment: [
      {
        name: "Main PC",
        monitorHz: 144,
        cpu: "Test CPU",
        gpu: "Test GPU",
        ramGb: 16,
      },
    ],
    features: [
      { category: "service" as const, name: "Wi-Fi" },
      { category: "room_type" as const, name: "VIP" },
    ],
    pricing: [
      {
        category: "vip" as const,
        name: "VIP hourly",
        hourlyPrice: 25000,
        discountPercent: 10,
      },
    ],
    images: [
      { imageUrl: "https://example.com/club.jpg", altText: "Club room" },
    ],
    gameIds: [gameResult.rows[0].id],
    workingHours: { fri: [{ open: "20:00", close: "02:00" }] },
  };

  const unauthenticated = await request("", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const ordinaryUser = await request(
    "",
    { method: "POST", body: JSON.stringify(payload) },
    userToken,
  );
  assert.equal(unauthenticated.status, 401);
  assert.equal(ordinaryUser.status, 403);

  const createdResponse = await request(
    "",
    {
      method: "POST",
      body: JSON.stringify({ ...payload, ownerId: secondOwnerId }),
    },
    ownerToken,
  );
  assert.equal(
    createdResponse.status,
    400,
    "ownerId in client body must be rejected",
  );

  const create = await request(
    "",
    { method: "POST", body: JSON.stringify(payload) },
    ownerToken,
  );
  assert.equal(create.status, 201);
  const created = (
    (await create.json()) as {
      data: {
        id: string;
        status: string;
        location: { lng: number; lat: number };
      };
    }
  ).data;
  assert.equal(created.status, "pending");
  assert.deepEqual(created.location, payload.location);

  const failedTransactionSlug = `rollback-${Date.now()}`;
  const failedTransaction = await request(
    "",
    {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        slug: failedTransactionSlug,
        gameIds: ["999999999999999999"],
      }),
    },
    ownerToken,
  );
  assert.equal(failedTransaction.status, 400);
  const rolledBack = await databasePool.query<{ count: string }>(
    "SELECT count(*)::text FROM game_clubs WHERE slug = $1",
    [failedTransactionSlug],
  );
  assert.equal(
    rolledBack.rows[0].count,
    "0",
    "failed child insert must roll back the club row",
  );
  const invalidHardware = await request(
    `/${created.id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        equipment: [{ name: "Bad Hz", monitorHz: 1001 }],
      }),
    },
    ownerToken,
  );
  const invalidPrice = await request(
    `/${created.id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        pricing: [{ category: "standard", name: "Invalid", hourlyPrice: -1 }],
      }),
    },
    ownerToken,
  );
  assert.equal(invalidHardware.status, 400);
  assert.equal(invalidPrice.status, 400);

  const pendingList = await request("");
  const pendingItems = (
    (await pendingList.json()) as { data: Array<{ id: string }> }
  ).data;
  assert.equal(
    pendingItems.some((club) => club.id === created.id),
    false,
  );
  assert.equal((await request(`/${created.id}`)).status, 404);

  const duplicate = await request(
    "",
    { method: "POST", body: JSON.stringify(payload) },
    ownerToken,
  );
  assert.equal(duplicate.status, 409);
  const otherOwnerUpdate = await request(
    `/${created.id}`,
    { method: "PUT", body: JSON.stringify({ name: "Taken over" }) },
    secondOwnerToken,
  );
  assert.equal(otherOwnerUpdate.status, 403);
  const userUpdate = await request(
    `/${created.id}`,
    { method: "PUT", body: JSON.stringify({ name: "Taken over" }) },
    userToken,
  );
  assert.equal(userUpdate.status, 403);

  const ownerUpdate = await request(
    `/${created.id}`,
    { method: "PUT", body: JSON.stringify({ name: "Updated Gaming Club" }) },
    ownerToken,
  );
  assert.equal(ownerUpdate.status, 200);
  assert.equal(
    ((await ownerUpdate.json()) as { data: { name: string } }).data.name,
    "Updated Gaming Club",
  );

  await databasePool.query(
    "UPDATE game_clubs SET status = 'approved' WHERE id = $1",
    [created.id],
  );
  const publicDetail = await request(`/${created.id}`);
  assert.equal(publicDetail.status, 200);
  const detail = (
    (await publicDetail.json()) as {
      data: {
        location: { lng: number; lat: number };
        equipment: Array<{ monitorHz: number }>;
        features: unknown[];
        pricing: Array<{ hourlyPrice: number }>;
        images: unknown[];
        games: unknown[];
        workingHours: { fri: Array<{ open: string; close: string }> };
      };
    }
  ).data;
  assert.deepEqual(detail.location, payload.location);
  assert.equal(detail.equipment[0].monitorHz, 144);
  assert.equal(detail.features.length, 2);
  assert.equal(detail.pricing[0].hourlyPrice, 25000);
  assert.equal(detail.images.length, 1);
  assert.equal(detail.games.length, 1);
  assert.deepEqual(detail.workingHours.fri[0], {
    open: "20:00",
    close: "02:00",
  });
  const failedUpdate = await request(
    `/${created.id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        equipment: [{ name: "Should Roll Back", monitorHz: 120, ramGb: 8 }],
        gameIds: ["999999999999999999"],
      }),
    },
    ownerToken,
  );
  assert.equal(failedUpdate.status, 400);
  const preservedEquipment = await databasePool.query<{ name: string }>(
    "SELECT name FROM club_equipment WHERE club_id = $1",
    [created.id],
  );
  assert.equal(
    preservedEquipment.rows[0].name,
    "Main PC",
    "failed update must preserve previous profile rows",
  );
  const deletion = await request(
    `/${created.id}`,
    { method: "DELETE" },
    ownerToken,
  );
  assert.equal(deletion.status, 200);
  assert.equal((await request(`/${created.id}`)).status, 404);
  const stored = await databasePool.query<{
    is_active: boolean;
    owner_id: string;
  }>("SELECT is_active, owner_id::text FROM game_clubs WHERE id = $1", [
    created.id,
  ]);
  assert.equal(stored.rows[0].is_active, false);
  assert.equal(stored.rows[0].owner_id, ownerId);
});
