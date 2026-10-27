import type { RequestHandler } from "express";
import { favoritesService } from "./favorites.service.js";
import type { FavoritesListQuery } from "./favorites.schema.js";

export const listFavorites: RequestHandler = async (request, response) => {
  const query = response.locals.validatedRequest.query as FavoritesListQuery;
  const result = await favoritesService.list(request.auth!.id, query);
  response.json({ success: true, data: result.items, meta: { page: result.page, limit: result.limit, total: result.total } });
};

export const addFavorite: RequestHandler = async (request, response) => {
  const { clubId } = response.locals.validatedRequest.params as { clubId: string };
  const result = await favoritesService.add(request.auth!.id, clubId);
  response.status(result.created ? 201 : 200).json({ success: true, data: result.favorite });
};

export const removeFavorite: RequestHandler = async (request, response) => {
  const { clubId } = response.locals.validatedRequest.params as { clubId: string };
  const removed = await favoritesService.remove(request.auth!.id, clubId);
  response.json({ success: true, data: { removed } });
};
