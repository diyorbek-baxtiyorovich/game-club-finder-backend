import { z } from "zod";

export const favoritesListRequestSchema = z.object({
  params: z.object({}).strict(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }).strict(),
  body: z.object({}).strict().optional(),
}).strict();

export const favoriteClubRequestSchema = z.object({
  params: z.object({ clubId: z.string().regex(/^[1-9]\d*$/) }).strict(),
  query: z.object({}).strict(),
  body: z.object({}).strict().optional(),
}).strict();

export type FavoritesListQuery = z.infer<typeof favoritesListRequestSchema>["query"];
