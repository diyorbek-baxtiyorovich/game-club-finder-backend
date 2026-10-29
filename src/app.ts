import cors from "cors";
import express, { type Express, type Router } from "express";
import helmet from "helmet";

import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { requestContext } from "./middleware/request-context.js";
import { env } from "./config/env.js";
import { checkDatabase } from "./config/database.js";
import { gamesRouter } from "./modules/catalogs/games/games.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { clubsRouter } from "./modules/clubs/club.routes.js";
import { adminModerationRouter, clubSubmissionRouter } from "./modules/moderation/moderation.routes.js";
import { nearbyRouter } from "./modules/discovery/nearby.routes.js";
import { searchRouter } from "./modules/discovery/search.routes.js";
import { favoritesRouter } from "./modules/favorites/favorites.routes.js";
import { historyRouter } from "./modules/history/history.routes.js";
import { clubReviewsRouter, reviewsRouter } from "./modules/reviews/reviews.routes.js";
import { mediaRouter } from "./modules/media/media.routes.js";
import { swaggerRouter } from "./docs/swagger.routes.js";

export function createApp(
  registerRoutes?: (router: Router) => void,
  databaseCheck: () => Promise<void> = checkDatabase,
): Express {
  const app = express();

  app.disable("x-powered-by");
  // Behind nginx, req.ip (used by rate limits) must come from X-Forwarded-For.
  app.set("trust proxy", env.trustProxy);
  app.use(helmet());
  app.use(requestContext);
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: "1mb" }));

  const apiRouter = express.Router();
  apiRouter.use("/docs", swaggerRouter);
  apiRouter.get("/health", async (_request, response) => {
    await databaseCheck();
    response.json({ status: "ok" });
  });
  apiRouter.use("/v1/games", gamesRouter);
  apiRouter.use("/v1/auth", authRouter);
  apiRouter.use("/v1/users", usersRouter);
  apiRouter.use("/v1/clubs", nearbyRouter);
  apiRouter.use("/v1/clubs", clubReviewsRouter);
  apiRouter.use("/v1/clubs", clubsRouter);
  apiRouter.use("/v1/reviews", reviewsRouter);
  apiRouter.use("/v1/media", mediaRouter);
  apiRouter.use("/v1/favorites", favoritesRouter);
  apiRouter.use("/v1/history", historyRouter);
  apiRouter.use("/v1", searchRouter);
  apiRouter.use("/v1/clubs", clubSubmissionRouter);
  apiRouter.use("/v1/admin", adminModerationRouter);
  registerRoutes?.(apiRouter);
  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
