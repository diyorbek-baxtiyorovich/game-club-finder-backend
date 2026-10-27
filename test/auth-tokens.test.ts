import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { AppError } from "../src/common/errors/app-error.js";
import { createTokenService } from "../src/modules/auth/tokens.service.js";
import { verifyAccessToken } from "../src/modules/auth/jwt.service.js";
import type { User } from "../src/modules/users/user.schema.js";

const user: User = {
  id: "55",
  telegramId: "123456789",
  role: "club_owner",
  createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
  updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
};
const secret = "test-only-signing-secret-that-is-long-enough";
const fixedNow = new Date("2026-01-01T12:00:00.000Z");

function createMemorySessions() {
  const sessions = new Map<
    string,
    {
      id: string;
      familyId: string;
      userId: string;
      hash: string;
      expiresAt: Date;
      revokedAt: Date | null;
    }
  >();
  return {
    sessions,
    async createRefreshSession(input: {
      id: string;
      familyId: string;
      userId: string;
      refreshTokenHash: string;
      expiresAt: Date;
    }) {
      sessions.set(input.refreshTokenHash, {
        id: input.id,
        familyId: input.familyId,
        userId: input.userId,
        hash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
        revokedAt: null,
      });
    },
    async rotateRefreshSession(input: {
      oldTokenHash: string;
      newId: string;
      newTokenHash: string;
      expiresAt: Date;
      now: Date;
    }) {
      const current = sessions.get(input.oldTokenHash);
      if (!current) return { status: "invalid" as const };
      if (current.revokedAt || current.expiresAt <= input.now) {
        for (const session of sessions.values()) {
          if (session.familyId === current.familyId)
            session.revokedAt ??= input.now;
        }
        return {
          status: current.revokedAt
            ? ("reused" as const)
            : ("expired" as const),
        };
      }
      current.revokedAt = input.now;
      sessions.set(input.newTokenHash, {
        id: input.newId,
        familyId: current.familyId,
        userId: current.userId,
        hash: input.newTokenHash,
        expiresAt: input.expiresAt,
        revokedAt: null,
      });
      return {
        status: "rotated" as const,
        userId: current.userId,
        familyId: current.familyId,
      };
    },
    async revokeRefreshSessionFamily(tokenHash: string, now: Date) {
      const target = sessions.get(tokenHash);
      if (!target) return;
      for (const session of sessions.values()) {
        if (session.familyId === target.familyId) session.revokedAt ??= now;
      }
    },
  };
}

test("access JWT validates issuer, audience, expiry and role claims", async () => {
  const sessions = createMemorySessions();
  const tokenService = createTokenService(
    secret,
    sessions,
    async () => user,
    () => fixedNow,
  );
  const pair = await tokenService.issueTokens(user);
  const claims = await verifyAccessToken(
    pair.accessToken,
    secret,
    Math.floor(fixedNow.getTime() / 1000),
  );

  assert.deepEqual(claims, { id: "55", role: "club_owner" });
  await assert.rejects(
    verifyAccessToken(
      pair.accessToken,
      secret,
      Math.floor(fixedNow.getTime() / 1000) + 901,
    ),
    (error: unknown) => error instanceof AppError && error.statusCode === 401,
  );
  const storedHashes = [...sessions.sessions.keys()];
  assert.equal(storedHashes[0].length, 64);
  assert.notEqual(storedHashes[0], pair.refreshToken);
});

test("refresh rotates once and reuse revokes the token family", async () => {
  const sessions = createMemorySessions();
  const tokenService = createTokenService(
    secret,
    sessions,
    async () => user,
    () => fixedNow,
  );
  const first = await tokenService.issueTokens(user);
  const second = await tokenService.refresh(first.refreshToken);

  assert.notEqual(second.refreshToken, first.refreshToken);
  assert.equal(second.user.role, "club_owner");
  await assert.rejects(
    tokenService.refresh(first.refreshToken),
    (error: unknown) => error instanceof AppError && error.statusCode === 401,
  );
  await assert.rejects(
    tokenService.refresh(second.refreshToken),
    (error: unknown) => error instanceof AppError && error.statusCode === 401,
  );
});

test("logout revokes refresh sessions and unknown refresh tokens reveal no state", async () => {
  const sessions = createMemorySessions();
  const tokenService = createTokenService(
    secret,
    sessions,
    async () => user,
    () => fixedNow,
  );
  const pair = await tokenService.issueTokens(user);
  await tokenService.logout(pair.refreshToken);
  await assert.rejects(
    tokenService.refresh(pair.refreshToken),
    (error: unknown) => error instanceof AppError && error.statusCode === 401,
  );
  await tokenService.logout("nonexistent");
  assert.equal(
    createHash("sha256").update(pair.refreshToken).digest("hex").length,
    64,
  );
});
