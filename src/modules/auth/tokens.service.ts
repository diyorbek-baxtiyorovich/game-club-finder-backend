import { createHash, randomBytes, randomUUID } from "node:crypto";
import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";
import type { User } from "../users/user.schema.js";
import { usersService } from "../users/users.service.js";
import * as sessionsRepository from "./auth-sessions.repository.js";
import { signAccessToken } from "./jwt.service.js";

const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export function createTokenService(
  secret = env.jwtAccessSecret,
  sessions = sessionsRepository,
  findUserById = usersService.findById,
  now: () => Date = () => new Date(),
) {
  function requireSecret(): string {
    if (!secret || secret.length < 32) {
      throw new AppError(
        503,
        "AUTH_NOT_CONFIGURED",
        "Tokenni imzolash sozlanmagan.",
      );
    }
    return secret;
  }

  async function issueTokens(
    user: User,
    familyId = randomUUID(),
  ): Promise<AuthTokens> {
    const accessToken = await signAccessToken(
      user,
      requireSecret(),
      Math.floor(now().getTime() / 1000),
    );
    const refreshToken = randomBytes(32).toString("base64url");
    await sessions.createRefreshSession({
      id: randomUUID(),
      familyId,
      userId: user.id,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(now().getTime() + REFRESH_TTL_SECONDS * 1000),
    });
    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: 15 * 60,
    };
  }

  async function refresh(
    refreshToken: string,
  ): Promise<{ user: User } & AuthTokens> {
    requireSecret();
    if (!/^[A-Za-z0-9_-]{40,64}$/.test(refreshToken)) {
      throw new AppError(
        401,
        "INVALID_REFRESH_TOKEN",
        "Yangilash tokeni noto‘g‘ri.",
      );
    }
    const replacementToken = randomBytes(32).toString("base64url");
    const rotated = await sessions.rotateRefreshSession({
      oldTokenHash: hashRefreshToken(refreshToken),
      newId: randomUUID(),
      newTokenHash: hashRefreshToken(replacementToken),
      expiresAt: new Date(now().getTime() + REFRESH_TTL_SECONDS * 1000),
      now: now(),
    });
    if (rotated.status !== "rotated" || !rotated.userId || !rotated.familyId) {
      throw new AppError(
        401,
        "INVALID_REFRESH_TOKEN",
        "Yangilash tokeni noto‘g‘ri yoki muddati tugagan.",
      );
    }
    const user = await findUserById(rotated.userId);
    if (!user)
      throw new AppError(
        401,
        "INVALID_REFRESH_TOKEN",
        "Yangilash tokeni noto‘g‘ri.",
      );
    const accessToken = await signAccessToken(
      user,
      requireSecret(),
      Math.floor(now().getTime() / 1000),
    );
    return {
      user,
      accessToken,
      refreshToken: replacementToken,
      tokenType: "Bearer",
      expiresIn: 15 * 60,
    };
  }

  async function logout(refreshToken: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]{40,64}$/.test(refreshToken)) return;
    await sessions.revokeRefreshSessionFamily(
      hashRefreshToken(refreshToken),
      now(),
    );
  }

  return { issueTokens, refresh, logout };
}

export const tokenService = createTokenService();
