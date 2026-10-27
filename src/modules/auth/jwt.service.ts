import { SignJWT, jwtVerify } from "jose";
import { AppError } from "../../common/errors/app-error.js";
import type { User } from "../users/user.schema.js";

const ISSUER = "gameclubfinder-api";
const AUDIENCE = "gameclubfinder-client";
const ACCESS_TTL_SECONDS = 15 * 60;
const roles = new Set<User["role"]>(["user", "club_owner", "admin"]);

export interface AccessPrincipal {
  id: string;
  role: User["role"];
}

function secretKey(secret: string): Uint8Array {
  if (secret.length < 32) {
    throw new AppError(
      503,
      "AUTH_NOT_CONFIGURED",
      "Kirish tokenini imzolash sozlanmagan.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  user: Pick<User, "id" | "role">,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + ACCESS_TTL_SECONDS)
    .sign(secretKey(secret));
}

export async function verifyAccessToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<AccessPrincipal> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
      currentDate: new Date(nowSeconds * 1000),
    });
    if (
      typeof payload.sub !== "string" ||
      !/^\d+$/.test(payload.sub) ||
      typeof payload.role !== "string" ||
      !roles.has(payload.role as User["role"]) ||
      typeof payload.exp !== "number" ||
      typeof payload.iat !== "number"
    ) {
      throw new Error("Kirish tokenidagi ma’lumotlar noto‘g‘ri");
    }
    return { id: payload.sub, role: payload.role as User["role"] };
  } catch {
    throw new AppError(
      401,
      "UNAUTHENTICATED",
      "Tizimga kirish talab qilinadi.",
    );
  }
}

export const accessTokenTtlSeconds = ACCESS_TTL_SECONDS;
