import { app } from './app.js';
import { logger } from './common/logger.js';
import { closeDatabase } from './config/database.js';
import { env } from './config/env.js';

const server = app.listen(env.port, () => {
  logger.info({ port: env.port }, 'API server ishga tushdi');
});

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Serverni to‘xtatish boshlandi');

  server.close(async (serverError) => {
    try {
      await closeDatabase();
      logger.info({ signal }, 'Ma’lumotlar bazasi ulanishlari yopildi');
    } catch {
      logger.error({ signal, event: 'database_pool_close_failed' }, 'Ma’lumotlar bazasi ulanishlarini yopib bo‘lmadi');
      process.exitCode = 1;
    }

    if (serverError) {
      logger.error({ signal, event: 'http_server_close_failed' }, 'HTTP serverni to‘xtatib bo‘lmadi');
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
