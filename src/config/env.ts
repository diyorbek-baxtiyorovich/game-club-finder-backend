import "dotenv/config";
import { z } from "zod";
import { validationMessageUz } from "../common/errors/validation-message.js";

// Placeholder values from .env.example must never sign real tokens.
const PLACEHOLDER_PATTERN = /^(change_me|replace_with|your_)/i;

// An empty value (`KEY=`) means "not configured", same as a missing key.
const optionalSecret = (schema: z.ZodString) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const corsOrigin = z
  .string()
  .url()
  .refine((value) => new URL(value).origin === value, {
    message: "Faqat origin kiriting: protokol, domen va port (oxirida / va yo‘lsiz).",
  });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().min(1).max(65535),
  CORS_ORIGIN: z
    .string()
    .min(1)
    .transform((origins) => origins.split(",").map((origin) => origin.trim()))
    .pipe(z.array(corsOrigin).min(1)),
  // Number of reverse-proxy hops in front of the API (nginx = 1). 0 = no proxy.
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  TELEGRAM_BOT_TOKEN: optionalSecret(z.string().min(1)),
  JWT_ACCESS_SECRET: optionalSecret(z.string().min(32)),
}).superRefine((value, context) => {
  for (const key of ["TELEGRAM_BOT_TOKEN", "JWT_ACCESS_SECRET"] as const) {
    const secret = value[key];
    if (secret !== undefined && PLACEHOLDER_PATTERN.test(secret)) {
      context.addIssue({ code: "custom", path: [key], message: ".env.example namunasidagi qiymat ishlatilmaydi." });
    } else if (value.NODE_ENV === "production" && secret === undefined) {
      context.addIssue({ code: "custom", path: [key], message: "Production muhitida majburiy." });
    }
  }
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(
  input: NodeJS.ProcessEnv | Record<string, unknown>,
): AppEnv {
  const result = envSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues
      .map(
        (issue) =>
          `${issue.path.join(".") || "muhit"}: ${validationMessageUz(issue)}`,
      )
      .join("; ");
    throw new Error(`Muhit sozlamalari noto‘g‘ri: ${issues}`);
  }

  return result.data;
}

const parsedEnv = parseEnv(process.env);

export const env = {
  nodeEnv: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
  corsOrigins: parsedEnv.CORS_ORIGIN,
  logLevel: parsedEnv.LOG_LEVEL,
  trustProxy: parsedEnv.TRUST_PROXY,
  database: {
    host: parsedEnv.DB_HOST,
    port: parsedEnv.DB_PORT,
    name: parsedEnv.DB_NAME,
    user: parsedEnv.DB_USER,
    password: parsedEnv.DB_PASSWORD,
  },
  telegramBotToken: parsedEnv.TELEGRAM_BOT_TOKEN,
  jwtAccessSecret: parsedEnv.JWT_ACCESS_SECRET,
};
