export const up = (pgm) => {
  pgm.createTable("games", {
    id: { type: "bigserial", primaryKey: true },
    slug: { type: "varchar(64)", notNull: true, unique: true },
    name: { type: "varchar(120)", notNull: true },
    is_popular: { type: "boolean", notNull: true, default: false },
    sort_order: { type: "integer", notNull: true, default: 0 },
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
  pgm.dropTable("games");
};
