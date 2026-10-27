import { AppError } from "../../common/errors/app-error.js";
import * as repository from "./favorites.repository.js";
import type { FavoritesListQuery } from "./favorites.schema.js";

export const favoritesService = {
  async list(userId: string, query: FavoritesListQuery) {
    return { ...await repository.listFavorites(userId, query), ...query };
  },
  async add(userId: string, clubId: string) {
    const result = await repository.addFavorite(userId, clubId);
    if (!result) throw new AppError(404, "CLUB_NOT_FOUND", "Klub topilmadi.");
    return result;
  },
  remove: repository.removeFavorite,
};
