import pino from "pino";

import { env } from "../config/env.js";

export const logger = pino({
  level: env.logLevel,
  redact: {
    paths: [
      "authorization",
      "cookie",
      "password",
      "secret",
      "token",
      "botToken",
      "*.authorization",
      "*.cookie",
      "*.password",
      "*.secret",
      "*.token",
      "*.botToken",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
});
