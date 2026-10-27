import { Pool } from "pg";

import { AppError } from "../common/errors/app-error.js";
import { logger } from "../common/logger.js";
import { env } from "./env.js";

export const databasePool = new Pool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
});

databasePool.on("error", () => {
  logger.error(
    { event: "database_pool_client_error" },
    "Ma’lumotlar bazasi ulanishida xatolik yuz berdi",
  );
});

export async function checkDatabase(): Promise<void> {
  try {
    const result = await databasePool.query<{ result: number }>(
      "SELECT 1 AS result",
    );
    if (result.rows[0]?.result !== 1) {
      throw new Error(
        "Ma’lumotlar bazasi tekshiruvi kutilmagan natija qaytardi",
      );
    }
  } catch {
    throw new AppError(
      503,
      "DATABASE_UNAVAILABLE",
      "Ma’lumotlar bazasi hozir ishlamayapti.",
    );
  }
}

export async function getPostgisVersion(): Promise<string> {
  try {
    const result = await databasePool.query<{ version: string }>(
      "SELECT PostGIS_Version() AS version",
    );
    return result.rows[0].version;
  } catch {
    throw new AppError(
      503,
      "DATABASE_UNAVAILABLE",
      "Ma’lumotlar bazasi yoki PostGIS hozir ishlamayapti.",
    );
  }
}

export async function closeDatabase(): Promise<void> {
  await databasePool.end();
}
