import type { RequestHandler } from "express";
import type { LoginResult } from "./auth.service.js";

export type LoginTelegram = (initData: string) => Promise<LoginResult>;

export function createTelegramAuthController(
  login: LoginTelegram,
): RequestHandler {
  return async (_request, response) => {
    const validated = response.locals.validatedRequest as {
      body: { initData: string };
    };
    const result = await login(validated.body.initData);
    response.json({ success: true, data: result });
  };
}
