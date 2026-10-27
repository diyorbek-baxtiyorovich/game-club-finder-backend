import type { User } from "../users/user.schema.js";
import { authenticateTelegram } from "./telegram-auth.service.js";
import { tokenService, type AuthTokens } from "./tokens.service.js";

export interface LoginResult extends AuthTokens {
  user: User;
}

export function createAuthService(
  telegramAuthenticate = authenticateTelegram,
  tokens = tokenService,
) {
  return {
    async loginTelegram(initData: string): Promise<LoginResult> {
      const user = await telegramAuthenticate(initData);
      return { user, ...(await tokens.issueTokens(user)) };
    },
    refresh: tokens.refresh,
    logout: tokens.logout,
  };
}

export const authService = createAuthService();
