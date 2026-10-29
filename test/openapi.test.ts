import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parse } from "yaml";

test("OpenAPI document parses and freezes the implemented v1 route groups", async () => {
  const source = await readFile(
    new URL("../docs/openapi.yaml", import.meta.url),
    "utf8",
  );
  const specification = parse(source) as {
    openapi: string;
    info: { version: string };
    paths: Record<string, Record<string, unknown>>;
    components: { securitySchemes: Record<string, { scheme: string }> };
  };

  assert.equal(specification.openapi, "3.1.0");
  assert.equal(specification.info.version, "1.0.0");
  for (const path of [
    "/api/health",
    "/games",
    "/auth/telegram",
    "/users/me",
    "/clubs",
    "/clubs/nearby",
    "/search",
    "/filters/options",
    "/clubs/{id}",
    "/clubs/{id}/availability",
    "/clubs/{id}/stats",
    "/clubs/{id}/images",
    "/clubs/{id}/images/{imageId}",
    "/media/{id}",
    "/clubs/{id}/reviews",
    "/reviews/{id}",
    "/reviews/{id}/reply",
    "/reviews/{id}/helpful",
    "/admin/reviews/{id}/status",
    "/favorites",
    "/favorites/{clubId}",
    "/history",
    "/admin/stats",
    "/admin/audit",
    "/admin/clubs/pending",
    "/admin/clubs/{id}/status",
    "/clubs/{id}/status",
  ]) {
    assert.ok(specification.paths[path], `OpenAPI path missing: ${path}`);
  }
  assert.equal(
    specification.components.securitySchemes.bearerAuth.scheme,
    "bearer",
  );
});
