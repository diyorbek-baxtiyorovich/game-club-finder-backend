// Preloaded by `npm test` into every test process (see package.json).
// Integration tests insert and delete rows, and audit_events is append-only,
// so they must never run against the development or production database.
import "dotenv/config";

// Tests check real 401/403 behaviour, so the local AUTH_DISABLED bypass from
// .env must not leak in. This runs after dotenv and before src/config/env.ts.
process.env.AUTH_DISABLED = "false";

const databaseName = process.env.DB_NAME ?? "";

if (!databaseName.endsWith("_test") || process.env.NODE_ENV === "production") {
  console.error(
    `Testlar faqat nomi "_test" bilan tugaydigan bazada ishlaydi (hozir: "${databaseName || "belgilanmagan"}"). ` +
      "README.md dagi \"Testlar\" bo‘limiga qarang.",
  );
  process.exit(1);
}
