import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

import { createApp } from "../src/app.js";
import { databasePool } from "../src/config/database.js";
import { env } from "../src/config/env.js";
import { objectStorage } from "../src/integrations/storage/local-file-storage.js";
import { signAccessToken } from "../src/modules/auth/jwt.service.js";

let server: Server;
let baseUrl: string;
const userIds: string[] = [];
const clubIds: string[] = [];
const ownerTokens: string[] = [];
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/mXcAAAAASUVORK5CYII=",
  "base64",
);

async function createUser(): Promise<{ id: string; token: string }> {
  const telegramId = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  const result = await databasePool.query<{ id: string }>(
    "INSERT INTO users (telegram_id,role) VALUES ($1,'club_owner') RETURNING id::text",
    [telegramId],
  );
  const id = result.rows[0].id;
  userIds.push(id);
  return {
    id,
    token: await signAccessToken(
      { id, role: "club_owner" },
      env.jwtAccessSecret!,
    ),
  };
}

async function createClub(ownerId: string): Promise<string> {
  const slug = `media-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await databasePool.query<{ id: string }>(
    `INSERT INTO game_clubs (owner_id,name,slug,address,city,location,status)
     VALUES ($1,'Media integration club',$2,'Test address','Tashkent',
       ST_SetSRID(ST_MakePoint(69.24,41.30),4326)::geography,'approved') RETURNING id::text`,
    [ownerId, slug],
  );
  clubIds.push(result.rows[0].id);
  return result.rows[0].id;
}

async function upload(
  clubId: string,
  token: string | undefined,
  bytes: Buffer,
  mime = "image/png",
  category = "interior",
  order = 0,
) {
  return fetch(`${baseUrl}/api/v1/clubs/${clubId}/images`, {
    method: "POST",
    headers: {
      "content-type": mime,
      "x-media-category": category,
      "x-display-order": String(order),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "x-original-filename": "../../untrusted-name.png",
    },
    body: new Uint8Array(bytes),
  });
}

before(async () => {
  assert.ok(env.jwtAccessSecret);
  const owner = await createUser();
  const otherOwner = await createUser();
  ownerTokens.push(owner.token, otherOwner.token);
  clubIds.push(await createClub(owner.id), await createClub(otherOwner.id));
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
    const stored = await databasePool.query<{ storage_key: string }>(
      "SELECT storage_key FROM club_images WHERE club_id=ANY($1::bigint[]) AND storage_key IS NOT NULL",
      [clubIds],
    );
    await Promise.all(
      stored.rows.map((row) => objectStorage.delete(row.storage_key)),
    );
    await databasePool.query(
      "DELETE FROM game_clubs WHERE id=ANY($1::bigint[])",
      [clubIds],
    );
  }
  if (userIds.length)
    await databasePool.query("DELETE FROM users WHERE id=ANY($1::bigint[])", [
      userIds,
    ]);
  await databasePool.end();
});

test("club image upload checks ownership, image bytes, size, count and serves its URL", async () => {
  const clubId = clubIds[0];
  assert.equal((await upload(clubId, undefined, png)).status, 401);
  assert.equal((await upload(clubId, ownerTokens[1], png)).status, 403);
  assert.equal(
    (await upload(clubId, ownerTokens[0], Buffer.from("not an image"))).status,
    415,
  );
  assert.equal(
    (await upload(clubId, ownerTokens[0], png, "application/pdf")).status,
    415,
  );
  assert.equal(
    (await upload(clubId, ownerTokens[0], png, "image/png", "logo")).status,
    400,
  );
  assert.equal(
    (await upload(clubId, ownerTokens[0], png, "image/png", "cover", -1))
      .status,
    400,
  );
  assert.equal(
    (await upload(clubId, ownerTokens[0], Buffer.alloc(8 * 1024 * 1024 + 1)))
      .status,
    413,
  );

  let uploadedId = "";
  let uploadedUrl = "";
  for (let index = 0; index < 20; index++) {
    const response = await upload(
      clubId,
      ownerTokens[0],
      png,
      "image/png",
      index === 0 ? "cover" : "interior",
      index,
    );
    assert.equal(response.status, 201);
    const body = (await response.json()) as {
      data: { id: string; url: string; displayOrder: number };
    };
    if (index === 0) {
      uploadedId = body.data.id;
      uploadedUrl = body.data.url;
      assert.equal(body.data.displayOrder, 0);
      assert.match(uploadedUrl, /^\/api\/v1\/media\/\d+$/);
    }
  }
  assert.equal((await upload(clubId, ownerTokens[0], png)).status, 409);

  const storedKey = await databasePool.query<{ storage_key: string }>(
    "SELECT storage_key FROM club_images WHERE id=$1",
    [uploadedId],
  );
  assert.match(storedKey.rows[0].storage_key, /^[0-9a-f-]{36}\.png$/);

  const image = await fetch(`${baseUrl}${uploadedUrl}`);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/png");
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
  const club = (await fetch(`${baseUrl}/api/v1/clubs/${clubId}`).then(
    (response) => response.json(),
  )) as {
    data: {
      images: Array<{
        id: string;
        category: string;
        displayOrder: number;
        mimeType: string;
        sizeBytes: number;
      }>;
    };
  };
  const metadata = club.data.images.find((item) => item.id === uploadedId);
  assert.ok(metadata);
  assert.equal(metadata.category, "cover");
  assert.equal(metadata.mimeType, "image/png");
  assert.equal(metadata.sizeBytes, png.length);
});
