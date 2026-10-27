import { z } from "zod";

export const moderationListSchema = z
  .object({
    params: z.object({}),
    query: z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .strict(),
    body: z.object({}).strict().optional(),
  })
  .strict();

export const moderationClubIdSchema = z
  .object({
    id: z.string().regex(/^[1-9]\d*$/),
  })
  .strict();

export const changeClubStatusRequestSchema = z
  .object({
    params: moderationClubIdSchema,
    query: z.object({}),
    body: z
      .object({
        status: z.enum(["approved", "rejected"]),
        reason: z.string().trim().min(1).max(2_000).optional(),
      })
      .strict()
      .superRefine((body, context) => {
        if (body.status === "rejected" && !body.reason) {
          context.addIssue({
            code: "custom",
            path: ["reason"],
            message: "Klub rad etilganda sabab ko‘rsatilishi kerak.",
          });
        }
      }),
  })
  .strict();

export const clubStatusRequestSchema = z
  .object({
    params: moderationClubIdSchema,
    query: z.object({}),
    body: z.object({}).strict().optional(),
  })
  .strict();

export type ModerationStatusInput = z.infer<
  typeof changeClubStatusRequestSchema
>["body"];
