import assert from "node:assert/strict";
import test from "node:test";

import { parseEnv } from "../src/config/env.js";

test("environment values are validated and CORS origins are parsed", () => {
  assert.deepEqual(
    parseEnv({
      NODE_ENV: "test",
      PORT: "3123",
      CORS_ORIGIN: "http://localhost:5173,https://example.com",
      DB_HOST: "localhost",
      DB_PORT: "5432",
      DB_NAME: "gameclubfinder_test",
      DB_USER: "gameclub_test",
      DB_PASSWORD: "test-only-password",
    }),
    {
      NODE_ENV: "test",
      PORT: 3123,
      CORS_ORIGIN: ["http://localhost:5173", "https://example.com"],
      TRUST_PROXY: 0,
      LOG_LEVEL: "info",
      DB_HOST: "localhost",
      DB_PORT: 5432,
      DB_NAME: "gameclubfinder_test",
      DB_USER: "gameclub_test",
      DB_PASSWORD: "test-only-password",
    },
  );
});

test("missing required environment values produce clear field names", () => {
  assert.throws(
    () => parseEnv({}),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /NODE_ENV/);
      assert.match(error.message, /PORT/);
      assert.match(error.message, /CORS_ORIGIN/);
      assert.match(error.message, /DB_HOST/);
      assert.match(error.message, /DB_PASSWORD/);
      return true;
    },
  );
});

test("invalid environment values are not copied into validation errors", () => {
  assert.throws(
    () =>
      parseEnv({
        NODE_ENV: "test",
        PORT: "private-token-value",
        CORS_ORIGIN: "http://localhost:5173",
        DB_HOST: "localhost",
        DB_PORT: "5432",
        DB_NAME: "gameclubfinder_test",
        DB_USER: "gameclub_test",
        DB_PASSWORD: "test-only-password",
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /PORT/);
      assert.doesNotMatch(error.message, /private-token-value/);
      return true;
    },
  );
});

const baseEnv = {
  NODE_ENV: "test",
  PORT: "3000",
  CORS_ORIGIN: "http://localhost:5173",
  DB_HOST: "localhost",
  DB_PORT: "5432",
  DB_NAME: "gameclubfinder_test",
  DB_USER: "gameclub_test",
  DB_PASSWORD: "test-only-password",
};
const strongSecret = "x".repeat(16) + "-not-a-placeholder-secret";

test("production requires auth secrets, while empty values mean not configured elsewhere", () => {
  assert.throws(
    () => parseEnv({ ...baseEnv, NODE_ENV: "production" }),
    /TELEGRAM_BOT_TOKEN.*JWT_ACCESS_SECRET|JWT_ACCESS_SECRET.*TELEGRAM_BOT_TOKEN/s,
  );
  const production = parseEnv({
    ...baseEnv,
    NODE_ENV: "production",
    TELEGRAM_BOT_TOKEN: "123:abc",
    JWT_ACCESS_SECRET: strongSecret,
    TRUST_PROXY: "1",
  });
  assert.equal(production.TRUST_PROXY, 1);
  const development = parseEnv({ ...baseEnv, TELEGRAM_BOT_TOKEN: "", JWT_ACCESS_SECRET: "" });
  assert.equal(development.TELEGRAM_BOT_TOKEN, undefined);
  assert.equal(development.JWT_ACCESS_SECRET, undefined);
});

test(".env.example placeholder secrets are rejected", () => {
  assert.throws(
    () => parseEnv({ ...baseEnv, JWT_ACCESS_SECRET: "replace_with_a_random_secret_at_least_32_characters" }),
    /JWT_ACCESS_SECRET/,
  );
  assert.throws(
    () => parseEnv({ ...baseEnv, TELEGRAM_BOT_TOKEN: "your_bot_token_from_botfather" }),
    /TELEGRAM_BOT_TOKEN/,
  );
});

test("CORS_ORIGIN accepts only bare origins", () => {
  assert.throws(() => parseEnv({ ...baseEnv, CORS_ORIGIN: "https://app.example.com/" }), /CORS_ORIGIN/);
  assert.throws(() => parseEnv({ ...baseEnv, CORS_ORIGIN: "https://app.example.com/path" }), /CORS_ORIGIN/);
  assert.deepEqual(parseEnv({ ...baseEnv, CORS_ORIGIN: "https://app.example.com:8443" }).CORS_ORIGIN, [
    "https://app.example.com:8443",
  ]);
});
