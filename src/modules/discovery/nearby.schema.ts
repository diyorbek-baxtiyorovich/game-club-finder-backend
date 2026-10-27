import { z } from "zod";

const decimal = z
  .string()
  .trim()
  .min(1)
  .regex(/^[-+]?\d+(?:\.\d+)?$/)
  .transform(Number)
  .pipe(z.number().finite());
const coordinate = (min: number, max: number) =>
  decimal.pipe(z.number().min(min).max(max));

export const nearbyRequestSchema = z
  .object({
    params: z.object({}),
    body: z.object({}).strict().optional(),
    query: z
      .object({
        lat: coordinate(-90, 90).optional(),
        lng: coordinate(-180, 180).optional(),
        radius: z
          .string()
          .trim()
          .regex(/^\d+$/)
          .transform(Number)
          .pipe(z.number().int().min(1).max(50_000))
          .optional(),
        city: z.string().trim().min(1).max(120).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .strict()
      .superRefine((query, context) => {
        const hasLat = query.lat !== undefined;
        const hasLng = query.lng !== undefined;
        const hasCoordinates = hasLat && hasLng;
        if (hasLat !== hasLng) {
          context.addIssue({
            code: "custom",
            path: [hasLat ? "lng" : "lat"],
            message: "lat va lng birga yuborilishi kerak.",
          });
        }
        if (hasCoordinates === Boolean(query.city)) {
          context.addIssue({
            code: "custom",
            path: ["city"],
            message: "Koordinatalar yoki shaharni yuboring.",
          });
        }
        if (query.radius !== undefined && !hasCoordinates) {
          context.addIssue({
            code: "custom",
            path: ["radius"],
            message: "radius faqat koordinatalar bilan yuborilishi mumkin.",
          });
        }
      }),
  })
  .strict();

export type NearbyQuery = z.infer<typeof nearbyRequestSchema>["query"];
