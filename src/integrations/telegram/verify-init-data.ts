import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../../common/errors/app-error.js";
import { telegramIdSchema } from "../../modules/users/user.schema.js";

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;
const MAX_FUTURE_SKEW_SECONDS = 30;
const MAX_TELEGRAM_ID = 9_223_372_036_854_775_807n;

export interface VerifiedTelegramInitData {
  telegramId: string;
}

function invalidTelegramAuth(): AppError {
  return new AppError(
    401,
    "INVALID_TELEGRAM_AUTH",
    "Telegram orqali kirish ma’lumotlari noto‘g‘ri.",
  );
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  nowMs = Date.now(),
): VerifiedTelegramInitData {
  const params = new URLSearchParams(initData);
  const entries = [...params.entries()];
  if (
    entries.length === 0 ||
    new Set(entries.map(([key]) => key)).size !== entries.length
  ) {
    throw invalidTelegramAuth();
  }

  const suppliedHash = params.get("hash");
  if (!suppliedHash || !/^[\da-f]{64}$/i.test(suppliedHash)) {
    throw invalidTelegramAuth();
  }

  const dataCheckString = entries
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const expectedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest();
  const actualHash = Buffer.from(suppliedHash, "hex");
  if (
    actualHash.length !== expectedHash.length ||
    !timingSafeEqual(actualHash, expectedHash)
  ) {
    throw invalidTelegramAuth();
  }

  const authDateRaw = params.get("auth_date");
  if (!authDateRaw || !/^\d+$/.test(authDateRaw)) throw invalidTelegramAuth();
  const authDate = Number(authDateRaw);
  const nowSeconds = Math.floor(nowMs / 1000);
  if (
    !Number.isSafeInteger(authDate) ||
    authDate < nowSeconds - MAX_AUTH_AGE_SECONDS ||
    authDate > nowSeconds + MAX_FUTURE_SKEW_SECONDS
  ) {
    throw invalidTelegramAuth();
  }

  let telegramUser: unknown;
  try {
    telegramUser = JSON.parse(params.get("user") ?? "");
  } catch {
    throw invalidTelegramAuth();
  }
  if (
    !telegramUser ||
    typeof telegramUser !== "object" ||
    !("id" in telegramUser)
  ) {
    throw invalidTelegramAuth();
  }

  const id = (telegramUser as { id: unknown }).id;
  const telegramId =
    typeof id === "number" && Number.isSafeInteger(id) ? String(id) : id;
  const parsedId = telegramIdSchema.safeParse(telegramId);
  if (!parsedId.success || BigInt(parsedId.data) > MAX_TELEGRAM_ID)
    throw invalidTelegramAuth();

  return { telegramId: parsedId.data };
}
