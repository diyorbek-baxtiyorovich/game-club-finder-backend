import type { PoolClient } from "pg";
import { databasePool } from "../../config/database.js";

export interface RotatedSession {
  status: "rotated" | "reused" | "expired" | "invalid";
  userId?: string;
  familyId?: string;
}

export async function createRefreshSession(input: {
  id: string;
  familyId: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await databasePool.query(
    `INSERT INTO auth_sessions (id, family_id, user_id, refresh_token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.id,
      input.familyId,
      input.userId,
      input.refreshTokenHash,
      input.expiresAt,
    ],
  );
}

async function rollback(client: PoolClient): Promise<void> {
  await client.query("ROLLBACK").catch(() => undefined);
}

export async function rotateRefreshSession(input: {
  oldTokenHash: string;
  newId: string;
  newTokenHash: string;
  expiresAt: Date;
  now: Date;
}): Promise<RotatedSession> {
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{
      id: string;
      family_id: string;
      user_id: string;
      expires_at: Date;
      revoked_at: Date | null;
    }>(
      `SELECT id, family_id, user_id::text, expires_at, revoked_at
       FROM auth_sessions WHERE refresh_token_hash = $1 FOR UPDATE`,
      [input.oldTokenHash],
    );
    const current = result.rows[0];
    if (!current) {
      await client.query("COMMIT");
      return { status: "invalid" };
    }

    if (current.revoked_at || current.expires_at <= input.now) {
      await client.query(
        `UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, $2)
         WHERE family_id = $1`,
        [current.family_id, input.now],
      );
      await client.query("COMMIT");
      return { status: current.revoked_at ? "reused" : "expired" };
    }

    await client.query(
      "UPDATE auth_sessions SET revoked_at = $2 WHERE id = $1",
      [current.id, input.now],
    );
    await client.query(
      `INSERT INTO auth_sessions (id, family_id, user_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        input.newId,
        current.family_id,
        current.user_id,
        input.newTokenHash,
        input.expiresAt,
      ],
    );
    await client.query("COMMIT");
    return {
      status: "rotated",
      userId: current.user_id,
      familyId: current.family_id,
    };
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeRefreshSessionFamily(
  tokenHash: string,
  now: Date,
): Promise<void> {
  await databasePool.query(
    `UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, $2)
     WHERE family_id = (
       SELECT family_id FROM auth_sessions WHERE refresh_token_hash = $1
     )`,
    [tokenHash, now],
  );
}
