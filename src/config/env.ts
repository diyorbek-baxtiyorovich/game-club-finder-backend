import "dotenv/config";
import { z } from "zod";
import { validationMessageUz } from "../common/errors/validation-message.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().min(1).max(65535),
  CORS_ORIGIN: z
    .string()
    .min(1)
    .transform((origins) => origins.split(",").map((origin) => origin.trim()))
    .pipe(z.array(z.string().url()).min(1)),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
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
