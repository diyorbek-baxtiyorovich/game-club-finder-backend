import * as gamesRepository from './games.repository.js';

export const gamesService = {
  list: gamesRepository.listGames,
  listPopular: gamesRepository.listPopularGames,
};

export type GamesService = typeof gamesService;
