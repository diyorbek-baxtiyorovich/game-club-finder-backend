import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

import { createApp } from "../src/app.js";
import { databasePool } from "../src/config/database.js";
import { env } from "../src/config/env.js";
import { signAccessToken } from "../src/modules/auth/jwt.service.js";

let server: Server;
let baseUrl: string;
const userIds: string[] = [];
const clubIds: string[] = [];
const tokens: string[] = [];

async function request(
  path: string,
  method = "GET",
  token?: string,
  body?: unknown,
) {
  return fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function createUser(
  role: "user" | "club_owner" | "admin",
): Promise<{ id: string; token: string }> {
  const telegramId = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  const result = await databasePool.query<{ id: string }>(
    "INSERT INTO users (telegram_id,role) VALUES ($1,$2) RETURNING id::text",
    [telegramId, role],
  );
  const id = result.rows[0].id;
  userIds.push(id);
  return {
    id,
    token: await signAccessToken({ id, role }, env.jwtAccessSecret!),
  };
}

async function createClub(ownerId: string): Promise<string> {
  const slug = `reviews-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await databasePool.query<{ id: string }>(
    `INSERT INTO game_clubs (owner_id,name,slug,address,city,location,status)
     VALUES ($1,'Review integration club',$2,'Test address','Tashkent',
       ST_SetSRID(ST_MakePoint(69.24,41.30),4326)::geography,'approved') RETURNING id::text`,
    [ownerId, slug],
  );
  clubIds.push(result.rows[0].id);
  return result.rows[0].id;
}

const firstScores = {
  performance: 5,
  equipment: 5,
  service: 4,
  cleanliness: 4,
  comfort: 5,
  valueForMoney: 4,
  body: "Birinchi vaqtinchalik izoh.",
};
const secondScores = {
  performance: 1,
  equipment: 1,
  service: 1,
  cleanliness: 1,
  comfort: 1,
  valueForMoney: 1,
  body: "Ikkinchi vaqtinchalik izoh.",
};

before(async () => {
  assert.ok(env.jwtAccessSecret);
  const user1 = await createUser("user");
  const user2 = await createUser("user");
  const owner = await createUser("club_owner");
  const otherOwner = await createUser("club_owner");
  const admin = await createUser("admin");
  tokens.push(
    user1.token,
    user2.token,
    owner.token,
    otherOwner.token,
    admin.token,
  );
  clubIds.push(await createClub(owner.id));
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
  if (clubIds.length) {
    await databasePool.query(
      "DELETE FROM reviews WHERE club_id = ANY($1::bigint[])",
      [clubIds],
    );
    await databasePool.query(
      "DELETE FROM club_ratings WHERE club_id = ANY($1::bigint[])",
      [clubIds],
    );
    await databasePool.query(
      "DELETE FROM game_clubs WHERE id = ANY($1::bigint[])",
      [clubIds],
    );
  }
  if (userIds.length)
    await databasePool.query("DELETE FROM users WHERE id = ANY($1::bigint[])", [
      userIds,
    ]);
  await databasePool.end();
});

test("review moderation controls public ratings, protects authors and supports owner reply/helpful", async () => {
  const clubId = clubIds[0];
  const user1 = tokens[0];
  const user2 = tokens[1];
  const owner = tokens[2];
  const otherOwner = tokens[3];
  const admin = tokens[4];

  assert.equal(
    (await request(`/clubs/${clubId}/reviews`, "POST", undefined, firstScores))
      .status,
    401,
  );
  assert.equal(
    (
      await request(`/clubs/${clubId}/reviews`, "POST", user1, {
        ...firstScores,
        performance: 0,
      })
    ).status,
    400,
  );
  const created = await request(
    `/clubs/${clubId}/reviews`,
    "POST",
    user1,
    firstScores,
  );
  assert.equal(created.status, 201);
  const first = (await created.json()) as {
    data: { id: string; status: string };
  };
  assert.equal(first.data.status, "pending");
  assert.equal(
    (await request(`/clubs/${clubId}/reviews`, "POST", user1, firstScores))
      .status,
    409,
  );
  const hiddenPending = (await request(`/clubs/${clubId}/reviews`).then((r) =>
    r.json(),
  )) as { meta: { total: number } };
  assert.equal(hiddenPending.meta.total, 0);
  const ownPending = (await request(
    `/clubs/${clubId}/reviews`,
    "GET",
    user1,
  ).then((r) => r.json())) as {
    data: Array<{ id: string; ownReview: boolean; status: string }>;
  };
  assert.equal(ownPending.data[0].id, first.data.id);
  assert.equal(ownPending.data[0].ownReview, true);
  assert.equal(ownPending.data[0].status, "pending");
  assert.equal(
    (await request(`/reviews/${first.data.id}`, "PUT", user2, firstScores))
      .status,
    404,
  );
  assert.equal(
    (
      await request(`/reviews/${first.data.id}/status`, "PATCH", owner, {
        status: "approved",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`/admin/reviews/${first.data.id}/status`, "PATCH", admin, {
        status: "approved",
      })
    ).status,
    200,
  );

  const publicReviews = (await request(`/clubs/${clubId}/reviews`).then((r) =>
    r.json(),
  )) as { data: Array<{ rating: { overall: number }; helpfulCount: number }> };
  assert.equal(publicReviews.data.length, 1);
  assert.equal(publicReviews.data[0].rating.overall, 4.5);
  const searchUrl = `${baseUrl}/api/v1/search`;
  const search = await fetch(searchUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: "Review integration club" }),
  });
  let searchBody = (await search.json()) as {
    data: Array<{ id: string; ratingAvg: number | null }>;
  };
  assert.equal(
    searchBody.data.find((row) => row.id === clubId)?.ratingAvg,
    4.5,
  );

  assert.equal(
    (
      await request(`/reviews/${first.data.id}/reply`, "POST", otherOwner, {
        body: "Begona javob",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(`/reviews/${first.data.id}/reply`, "POST", owner, {
        body: "Rahmat, tashrifingiz uchun.",
      })
    ).status,
    200,
  );
  const helpful1 = await request(
    `/reviews/${first.data.id}/helpful`,
    "POST",
    user2,
  );
  const helpful2 = await request(
    `/reviews/${first.data.id}/helpful`,
    "POST",
    user2,
  );
  assert.equal(helpful1.status, 201);
  assert.equal(helpful2.status, 200);
  assert.equal(
    ((await helpful2.json()) as { data: { helpfulCount: number } }).data
      .helpfulCount,
    1,
  );

  const second = (await request(
    `/clubs/${clubId}/reviews`,
    "POST",
    user2,
    secondScores,
  ).then((r) => r.json())) as { data: { id: string } };
  searchBody = (await fetch(searchUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: "Review integration club" }),
  }).then((r) => r.json())) as typeof searchBody;
  assert.equal(
    searchBody.data.find((row) => row.id === clubId)?.ratingAvg,
    4.5,
    "pending rating must not affect public aggregate",
  );
  await request(`/admin/reviews/${second.data.id}/status`, "PATCH", admin, {
    status: "approved",
  });
  searchBody = (await fetch(searchUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: "Review integration club" }),
  }).then((r) => r.json())) as typeof searchBody;
  assert.equal(
    searchBody.data.find((row) => row.id === clubId)?.ratingAvg,
    2.75,
  );

  const edited = await request(`/reviews/${second.data.id}`, "PUT", user2, {
    ...secondScores,
    body: "Yangilangan izoh.",
  });
  assert.equal(edited.status, 200);
  assert.equal(
    ((await edited.json()) as { data: { status: string } }).data.status,
    "pending",
  );
  searchBody = (await fetch(searchUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: "Review integration club" }),
  }).then((r) => r.json())) as typeof searchBody;
  assert.equal(
    searchBody.data.find((row) => row.id === clubId)?.ratingAvg,
    4.5,
  );

  assert.equal(
    (await request(`/reviews/${first.data.id}`, "DELETE", user2)).status,
    404,
  );
  assert.equal(
    (await request(`/reviews/${first.data.id}`, "DELETE", user1)).status,
    200,
  );
  const remaining = (await request(`/clubs/${clubId}/reviews`).then((r) =>
    r.json(),
  )) as { meta: { total: number } };
  assert.equal(remaining.meta.total, 0);
  searchBody = (await fetch(searchUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: "Review integration club" }),
  }).then((r) => r.json())) as typeof searchBody;
  assert.equal(
    searchBody.data.find((row) => row.id === clubId)?.ratingAvg,
    null,
  );
  assert.equal(
    (await request(`/reviews/${second.data.id}`, "DELETE", user2)).status,
    200,
  );

  const rejected = (await request(
    `/clubs/${clubId}/reviews`,
    "POST",
    user1,
    firstScores,
  ).then((r) => r.json())) as { data: { id: string } };
  assert.equal(
    (
      await request(
        `/admin/reviews/${rejected.data.id}/status`,
        "PATCH",
        admin,
        { status: "rejected" },
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        `/admin/reviews/${rejected.data.id}/status`,
        "PATCH",
        admin,
        { status: "rejected", reason: "Tegishli emas." },
      )
    ).status,
    200,
  );
  assert.equal(
    (await request(`/reviews/${rejected.data.id}/helpful`, "POST", user2))
      .status,
    404,
  );
  assert.equal(
    (await request(`/reviews/${rejected.data.id}`, "DELETE", user1)).status,
    200,
  );
});
