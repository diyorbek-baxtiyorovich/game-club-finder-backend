import { Router } from 'express';
import { createGamesController } from './games.controller.js';
import { gamesService } from './games.service.js';

const controller = createGamesController(gamesService);

export const gamesRouter = Router();
gamesRouter.get('/', controller.list);
gamesRouter.get('/popular', controller.listPopular);
