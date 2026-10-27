import { databasePool } from "../config/database.js";
import { logger } from "../common/logger.js";

const games = [
  { slug: "cs2", name: "Counter-Strike 2", isPopular: true, sortOrder: 1 },
  { slug: "dota2", name: "Dota 2", isPopular: true, sortOrder: 2 },
  { slug: "valorant", name: "Valorant", isPopular: true, sortOrder: 3 },
  { slug: "lol", name: "League of Legends", isPopular: true, sortOrder: 4 },
  { slug: "gta5", name: "Grand Theft Auto V", isPopular: true, sortOrder: 5 },
] as const;

async function seedGames(): Promise<void> {
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    for (const game of games) {
      await client.query(
        `INSERT INTO games (slug, name, is_popular, sort_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           is_popular = EXCLUDED.is_popular,
           sort_order = EXCLUDED.sort_order,
           updated_at = CURRENT_TIMESTAMP`,
        [game.slug, game.name, game.isPopular, game.sortOrder],
      );
    }
    await client.query("COMMIT");
    logger.info(
      { gameCount: games.length },
      "O‘yinlar katalogi bazaga yozildi",
    );
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    logger.error(
      { event: "game_catalog_seed_failed" },
      "O‘yinlar katalogini bazaga yozib bo‘lmadi",
    );
    process.exitCode = 1;
  } finally {
    client.release();
    await databasePool.end();
  }
}

await seedGames();
