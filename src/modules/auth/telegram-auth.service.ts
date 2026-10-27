import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";
import { verifyTelegramInitData } from "../../integrations/telegram/verify-init-data.js";
import type { User } from "../users/user.schema.js";
import { usersService } from "../users/users.service.js";

export type TelegramUserUpsert = (telegramId: string) => Promise<User>;

export function createTelegramAuthService(
  botToken: string | undefined,
  upsertUser: TelegramUserUpsert = usersService.upsertByTelegramId,
  now: () => number = Date.now,
) {
  return async function authenticate(initData: string): Promise<User> {
    if (!botToken) {
      throw new AppError(
        503,
        "AUTH_NOT_CONFIGURED",
        "Telegram orqali kirish sozlanmagan.",
      );
    }
    const { telegramId } = verifyTelegramInitData(initData, botToken, now());
    return upsertUser(telegramId);
  };
}

export const authenticateTelegram = createTelegramAuthService(
  env.telegramBotToken,
);
