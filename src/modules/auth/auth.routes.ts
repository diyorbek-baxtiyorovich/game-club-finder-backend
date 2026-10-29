import { rateLimit } from "express-rate-limit";
import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../common/errors/app-error.js";
import { validate } from "../../middleware/validate.js";
import { authService, type LoginResult } from "./auth.service.js";

export interface AuthActions {
  loginTelegram(initData: string): Promise<LoginResult>;
  refresh(
    refreshToken: string,
  ): Promise<{ user: LoginResult["user"] } & Omit<LoginResult, "user">>;
  logout(refreshToken: string): Promise<void>;
}

const loginSchema = z.object({
  body: z.object({ initData: z.string().min(1).max(8192) }),
});
const refreshSchema = z.object({
  body: z.object({ refreshToken: z.string().min(1).max(128) }),
});
const logoutSchema = refreshSchema;

function limiter(limit: number) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    // Goes through the shared error handler so 429 has the same shape (with requestId).
    handler: (_request, _response, next) => {
      next(
        new AppError(
          429,
          "RATE_LIMITED",
          "Kirish so‘rovlari soni chegaradan oshdi. Birozdan so‘ng qayta urinib ko‘ring.",
        ),
      );
    },
  });
}

export function createAuthRouter(actions: AuthActions = authService): Router {
  const router = Router();

  router.post(
    "/telegram",
    limiter(10),
    validate(loginSchema),
    async (_request, response, next) => {
      try {
        const { initData } = (
          response.locals.validatedRequest as { body: { initData: string } }
        ).body;
        response.json({
          success: true,
          data: await actions.loginTelegram(initData),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/refresh",
    limiter(20),
    validate(refreshSchema),
    async (_request, response, next) => {
      try {
        const { refreshToken } = (
          response.locals.validatedRequest as { body: { refreshToken: string } }
        ).body;
        response.json({
          success: true,
          data: await actions.refresh(refreshToken),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/logout",
    limiter(20),
    validate(logoutSchema),
    async (_request, response, next) => {
      try {
        const { refreshToken } = (
          response.locals.validatedRequest as { body: { refreshToken: string } }
        ).body;
        await actions.logout(refreshToken);
        response.json({ success: true, data: { loggedOut: true } });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

export const authRouter = createAuthRouter();
