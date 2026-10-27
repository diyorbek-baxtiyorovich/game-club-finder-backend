import { z } from "zod";

export const clubStatisticsRequestSchema = z.object({
  params: z.object({ id: z.string().regex(/^[1-9]\d*$/) }).strict(),
  query: z.object({}).strict(),
  body: z.object({}).strict().optional(),
}).strict();

export const auditListRequestSchema = z.object({
  params: z.object({}).strict(),
  query: z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }).strict(),
  body: z.object({}).strict().optional(),
}).strict();
export type AuditListQuery = z.infer<typeof auditListRequestSchema>["query"];
