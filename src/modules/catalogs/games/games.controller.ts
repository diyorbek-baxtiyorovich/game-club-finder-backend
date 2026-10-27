import type { RequestHandler } from 'express';
import type { GamesService } from './games.service.js';

export function createGamesController(service: GamesService) {
  const list: RequestHandler = async (_request, response) => {
    response.json({ success: true, data: await service.list() });
  };

  const listPopular: RequestHandler = async (_request, response) => {
    response.json({ success: true, data: await service.listPopular() });
  };

  return { list, listPopular };
}
