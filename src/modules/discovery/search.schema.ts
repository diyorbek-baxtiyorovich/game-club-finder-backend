import { z } from "zod";

const coordinates = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusMeters: z.number().int().min(1).max(50_000),
  })
  .strict();
const price = z
  .object({
    min: z.number().finite().min(0).optional(),
    max: z.number().finite().min(0).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.min !== undefined &&
      value.max !== undefined &&
      value.min > value.max
    )
      ctx.addIssue({
        code: "custom",
        path: ["max"],
        message: "max qiymati min qiymatidan kichik bo‘lmasligi kerak.",
      });
  });

export const searchBodySchema = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    city: z.string().trim().min(1).max(120).optional(),
    location: coordinates.optional(),
    ratingMin: z.number().min(0).max(5).optional(),
    games: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
    hardware: z
      .object({
        screenHzMin: z.number().int().min(30).max(1000).optional(),
        ramGbMin: z.number().int().min(1).max(1024).optional(),
      })
      .strict()
      .optional(),
    roomTypes: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
    services: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
    price: price.optional(),
    openNow: z.boolean().optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sort: z
      .enum(["newest", "name", "price_low", "price_high", "distance"])
      .default("newest"),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.city && value.location)
      ctx.addIssue({
        code: "custom",
        path: ["city"],
        message: "Shahar yoki joylashuvdan bittasini yuboring.",
      });
    if (value.sort === "distance" && !value.location)
      ctx.addIssue({
        code: "custom",
        path: ["sort"],
        message: "Masofa bo‘yicha saralash uchun joylashuv kerak.",
      });
  });

export const searchRequestSchema = z
  .object({ params: z.object({}), query: z.object({}), body: searchBodySchema })
  .strict();
export type SearchBody = z.infer<typeof searchBodySchema>;
