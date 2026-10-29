import { z } from "zod";

const mediaId = z.string().regex(/^[1-9]\d*$/);

export const mediaClubIdRequestSchema = z.object({
  params: z.object({ id: mediaId }).strict(),
  query: z.object({}).strict(),
  body: z.object({}).strict().optional(),
}).strict();

export const mediaIdRequestSchema = z.object({
  params: z.object({ id: mediaId }).strict(),
  query: z.object({}).strict(),
  body: z.object({}).strict().optional(),
}).strict();

export type MediaCategory = "cover" | "interior" | "equipment";

export const mediaClubImageRequestSchema = z.object({
  params: z.object({ id: mediaId, imageId: mediaId }).strict(),
  query: z.object({}).strict(),
  body: z.object({}).strict().optional(),
}).strict();
