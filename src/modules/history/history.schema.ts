import { z } from "zod";

export const historyListRequestSchema = z.object({
  params: z.object({}).strict(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }).strict(),
  body: z.object({}).strict().optional(),
}).strict();

export type HistoryListQuery = z.infer<typeof historyListRequestSchema>["query"];
