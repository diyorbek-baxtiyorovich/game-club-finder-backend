import { Client } from "pg";
import { runner } from "node-pg-migrate";
import { resolve } from "node:path";

import { logger } from "../common/logger.js";
import { env } from "../config/env.js";

const direction = process.argv[2];
if (direction !== "up" && direction !== "down") {
  console.error("Foydalanish: npm run db:migrate -- [up|down]");
  process.exitCode = 2;
} else {
  const client = new Client({
    host: env.database.host,
    port: env.database.port,
    database: env.database.name,
    user: env.database.user,
    password: env.database.password,
    connectionTimeoutMillis: 5_000,
  });

  try {
    await client.connect();
    const migrations = await runner({
      dbClient: client,
      dir: resolve(process.cwd(), "database", "migrations"),
      direction,
      migrationsTable: "pgmigrations",
      verbose: false,
    });
    logger.info(
      { direction, migrationCount: migrations.length },
      "Ma’lumotlar bazasi migratsiyalari yakunlandi",
    );
  } catch (error) {
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "DATABASE_MIGRATION_FAILED";
    logger.error(
      { direction, errorCode },
      "Ma’lumotlar bazasi migratsiyasida xatolik yuz berdi",
    );
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {
      logger.error(
        { event: "migration_client_close_failed" },
        "Migratsiya ulanishini yopib bo‘lmadi",
      );
      process.exitCode = 1;
    });
  }
}
