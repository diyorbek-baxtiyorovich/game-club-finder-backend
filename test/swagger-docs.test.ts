import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

test("Swagger UI and its OpenAPI document are served from /api/docs", async () => {
  const page = await request(app).get("/api/docs").expect(200);
  assert.match(page.headers["content-type"], /text\/html/);
  assert.match(page.text, /id="swagger-ui"/);
  assert.match(page.text, /swagger-ui-bundle\.js/);
  assert.match(page.text, /\/api\/docs\/init\.js/);

  const initializer = await request(app).get("/api/docs/init.js").expect(200);
  assert.match(initializer.text, /\/api\/docs\/openapi\.yaml/);

  const specification = await request(app).get("/api/docs/openapi.yaml").expect(200);
  assert.match(specification.text, /openapi: 3\.1\.0/);
  assert.match(specification.text, /url: \/api\/v1/);
});
