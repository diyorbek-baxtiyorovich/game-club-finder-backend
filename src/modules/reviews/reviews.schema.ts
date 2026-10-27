import { z } from "zod";

const positiveId = z.string().regex(/^[1-9]\d*$/);
const score = z.number().int().min(1).max(5);
const reviewScores = z.object({
  performance: score,
  equipment: score,
  service: score,
  cleanliness: score,
  comfort: score,
  valueForMoney: score,
}).strict();

export const clubReviewsRequestSchema = z.object({
  params: z.object({ id: positiveId }).strict(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }).strict(),
  body: z.object({}).strict().optional(),
}).strict();

export const createReviewRequestSchema = z.object({
  params: z.object({ id: positiveId }).strict(),
  query: z.object({}).strict(),
  body: reviewScores.extend({ body: z.string().trim().min(1).max(3000) }).strict(),
}).strict();

export const updateReviewRequestSchema = z.object({
  params: z.object({ id: positiveId }).strict(),
  query: z.object({}).strict(),
  body: reviewScores.extend({ body: z.string().trim().min(1).max(3000) }).strict(),
}).strict();

export const reviewIdRequestSchema = z.object({
  params: z.object({ id: positiveId }).strict(),
  query: z.object({}).strict(),
  body: z.object({}).strict().optional(),
}).strict();

export const reviewReplyRequestSchema = z.object({
  params: z.object({ id: positiveId }).strict(),
  query: z.object({}).strict(),
  body: z.object({ body: z.string().trim().min(1).max(2000) }).strict(),
}).strict();

export const reviewModerationRequestSchema = z.object({
  params: z.object({ id: positiveId }).strict(),
  query: z.object({}).strict(),
  body: z.object({
    status: z.enum(["approved", "rejected"]),
    reason: z.string().trim().min(1).max(2000).optional(),
  }).strict().superRefine((value, context) => {
    if (value.status === "rejected" && !value.reason) {
      context.addIssue({ code: "custom", path: ["reason"], message: "Rad etish sababi ko‘rsatilishi kerak." });
    }
  }),
}).strict();

export type ReviewScores = z.infer<typeof reviewScores>;
export type ReviewInput = ReviewScores & { body: string };
