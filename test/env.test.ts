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
