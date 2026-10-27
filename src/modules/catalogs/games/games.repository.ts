import { databasePool } from '../../../config/database.js';
import type { Game } from './game.schema.js';

interface GameRow {
  id: string;
  slug: string;
  name: string;
  is_popular: boolean;
  sort_order: number;
}

const selectGames = `
  SELECT id::text, slug, name, is_popular, sort_order
  FROM games
`;

function toGame(row: GameRow): Game {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    isPopular: row.is_popular,
    sortOrder: row.sort_order,
  };
}

export async function listGames(): Promise<Game[]> {
  const result = await databasePool.query<GameRow>(
    `${selectGames} ORDER BY sort_order ASC, name ASC`,
  );
  return result.rows.map(toGame);
}

export async function listPopularGames(): Promise<Game[]> {
  const result = await databasePool.query<GameRow>(
    `${selectGames} WHERE is_popular = true ORDER BY sort_order ASC, name ASC`,
  );
  return result.rows.map(toGame);
}
