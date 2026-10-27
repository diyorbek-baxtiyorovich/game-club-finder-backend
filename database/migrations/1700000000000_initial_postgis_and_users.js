export const up = (pgm) => {
  pgm.sql("CREATE EXTENSION IF NOT EXISTS postgis;");
  pgm.createTable("users", {
    id: { type: "bigserial", primaryKey: true },
    telegram_id: { type: "bigint", notNull: true, unique: true },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable("users");
};
