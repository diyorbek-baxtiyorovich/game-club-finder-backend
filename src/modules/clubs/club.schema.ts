import { z } from "zod";

const coordinatesSchema = z
  .object({
    lng: z.number().min(-180).max(180),
    lat: z.number().min(-90).max(90),
  })
  .strict();

const hourSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const timezoneSchema = z.string().trim().min(1).max(100).refine((timezone) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}, "Vaqt zonasi IANA formatida bo‘lishi kerak.");
const workingHoursSchema = z
  .object({
    mon: z
      .array(z.object({ open: hourSchema, close: hourSchema }).strict())
      .max(4)
      .optional(),
    tue: z
      .array(z.object({ open: hourSchema, close: hourSchema }).strict())
      .max(4)
      .optional(),
    wed: z
      .array(z.object({ open: hourSchema, close: hourSchema }).strict())
      .max(4)
      .optional(),
    thu: z
      .array(z.object({ open: hourSchema, close: hourSchema }).strict())
      .max(4)
      .optional(),
    fri: z
      .array(z.object({ open: hourSchema, close: hourSchema }).strict())
      .max(4)
      .optional(),
    sat: z
      .array(z.object({ open: hourSchema, close: hourSchema }).strict())
      .max(4)
      .optional(),
    sun: z
      .array(z.object({ open: hourSchema, close: hourSchema }).strict())
      .max(4)
      .optional(),
  })
  .strict()
  .superRefine((hours, context) => {
    for (const [day, intervals] of Object.entries(hours)) {
      for (const [index, interval] of (intervals ?? []).entries()) {
        if (interval.open === interval.close && interval.open !== "00:00") {
          context.addIssue({
            code: "custom",
            path: [day, index, "close"],
            message: "Bir xil vaqt faqat 24/7 jadvali uchun 00:00 bo‘lishi mumkin.",
          });
        }
      }
    }
  });

const equipmentSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    monitorHz: z.number().int().min(30).max(1000).nullable().optional(),
    cpu: z.string().trim().max(160).nullable().optional(),
    gpu: z.string().trim().max(160).nullable().optional(),
    ramGb: z.number().int().min(1).max(1024).nullable().optional(),
  })
  .strict();
const featureSchema = z
  .object({
    category: z.enum(["service", "room_type"]),
    name: z.string().trim().min(1).max(120),
  })
  .strict();
const pricingSchema = z
  .object({
    category: z.enum(["standard", "vip", "console"]),
    name: z.string().trim().min(1).max(120),
    hourlyPrice: z.number().finite().min(0).max(9_999_999_999.99),
    discountPercent: z.number().finite().min(0).max(100).nullable().optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .default("UZS"),
  })
  .strict();
const imageSchema = z
  .object({
    imageUrl: z.string().url().max(2048),
    altText: z.string().trim().max(250).nullable().optional(),
    sortOrder: z.number().int().min(0).max(100_000).default(0),
  })
  .strict();
const gameIdSchema = z.string().regex(/^[1-9]\d*$/);

export const clubProfileInputSchema = z
  .object({
    equipment: z.array(equipmentSchema).max(50).optional(),
    features: z.array(featureSchema).max(100).optional(),
    pricing: z.array(pricingSchema).max(100).optional(),
    images: z.array(imageSchema).max(100).optional(),
    gameIds: z
      .array(gameIdSchema)
      .max(100)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "O‘yin IDlari takrorlanmasligi kerak.",
      )
      .optional(),
    workingHours: workingHoursSchema.optional(),
    timezone: timezoneSchema.optional(),
  })
  .strict();

export const clubInputSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(180)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().trim().max(10_000).nullable().optional(),
    city: z.string().trim().min(1).max(120).nullable().optional(),
    address: z.string().trim().min(1).max(500),
    location: coordinatesSchema,
  })
  .extend(clubProfileInputSchema.shape)
  .strict();

export type ClubInput = z.infer<typeof clubInputSchema>;

export const clubListQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    city: z.string().trim().min(1).max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z
      .enum(["newest", "name", "price_low", "price_high"])
      .default("newest"),
  })
  .strict();
export type ClubListQuery = z.infer<typeof clubListQuerySchema>;

export const clubIdParamsSchema = z
  .object({
    id: z.string().regex(/^[1-9]\d*$/),
  })
  .strict();

export const createClubRequestSchema = z
  .object({
    params: z.object({}),
    query: z.object({}),
    body: clubInputSchema,
  })
  .strict();
export const updateClubRequestSchema = z
  .object({
    params: clubIdParamsSchema,
    query: z.object({}),
    body: clubInputSchema.partial().strict(),
  })
  .strict();
export const clubDetailRequestSchema = z
  .object({
    params: clubIdParamsSchema,
    query: z.object({}),
    body: z.object({}).strict().optional(),
  })
  .strict();
export const clubsListRequestSchema = z
  .object({
    params: z.object({}),
    query: clubListQuerySchema,
    body: z.object({}).strict().optional(),
  })
  .strict();

export interface Club {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  city: string | null;
  location: { lng: number; lat: number };
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  equipment: ClubEquipment[];
  features: ClubFeature[];
  pricing: ClubPricing[];
  images: ClubImage[];
  games: ClubGame[];
  workingHours: z.infer<typeof workingHoursSchema>;
  timezone: string;
}

export interface ClubEquipment {
  id: string;
  name: string;
  monitorHz: number | null;
  cpu: string | null;
  gpu: string | null;
  ramGb: number | null;
}
export interface ClubFeature {
  id: string;
  category: "service" | "room_type";
  name: string;
}
export interface ClubPricing {
  id: string;
  category: "standard" | "vip" | "console";
  name: string;
  hourlyPrice: number;
  discountPercent: number | null;
  currency: string;
}
export interface ClubImage {
  id: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  category: "cover" | "interior" | "equipment";
  displayOrder: number;
  mimeType: string | null;
  sizeBytes: number | null;
}
export interface ClubGame {
  id: string;
  slug: string;
  name: string;
}
