import {
  closeDatabase,
  checkDatabase,
  getPostgisVersion,
} from "../config/database.js";
import { logger } from "../common/logger.js";

try {
  await checkDatabase();
  const postgisVersion = await getPostgisVersion();
  logger.info(
    { postgisVersion },
    "PostgreSQL va PostGIS tekshiruvi muvaffaqiyatli o‘tdi",
  );
} catch (error) {
  const errorCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "DATABASE_CHECK_FAILED";
  logger.error(
    { errorCode },
    "PostgreSQL yoki PostGIS tekshiruvida xatolik yuz berdi",
  );
  process.exitCode = 1;
} finally {
  await closeDatabase().catch(() => {
    logger.error(
      { event: "database_pool_close_failed" },
      "Ma’lumotlar bazasi ulanishlarini yopib bo‘lmadi",
    );
    process.exitCode = 1;
  });
}
