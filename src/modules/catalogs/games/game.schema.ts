import { z } from 'zod';

export const gameSchema = z.object({
  id: z.string().regex(/^\d+$/),
  slug: z.string().min(1),
  name: z.string().min(1),
  isPopular: z.boolean(),
  sortOrder: z.number().int(),
});

export type Game = z.infer<typeof gameSchema>;
