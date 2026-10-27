import { Router } from "express";
import { authenticate } from "../auth/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { addFavorite, listFavorites, removeFavorite } from "./favorites.controller.js";
import { favoriteClubRequestSchema, favoritesListRequestSchema } from "./favorites.schema.js";

export const favoritesRouter = Router();
favoritesRouter.use(authenticate);
favoritesRouter.get("/", validate(favoritesListRequestSchema), listFavorites);
favoritesRouter.post("/:clubId", validate(favoriteClubRequestSchema), addFavorite);
favoritesRouter.delete("/:clubId", validate(favoriteClubRequestSchema), removeFavorite);
