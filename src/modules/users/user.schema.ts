import { z } from "zod";

export const telegramIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "telegram_id musbat butun son matni bo‘lishi kerak.");

export const userSchema = z.object({
  id: z.string().regex(/^\d+$/),
  telegramId: telegramIdSchema,
  role: z.enum(["user", "club_owner", "admin"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;

// GET /api/v1/users/me response contract; it remains unmounted until stage 05/06 auth.
export const currentUserResponseSchema = z.object({
  success: z.literal(true),
  data: userSchema,
});
