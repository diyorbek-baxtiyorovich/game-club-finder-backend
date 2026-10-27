export const up = (pgm) => {
  pgm.createTable("game_clubs", {
    id: { type: "bigserial", primaryKey: true },
    owner_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
    },
    name: { type: "varchar(160)", notNull: true },
    slug: { type: "varchar(180)", notNull: true, unique: true },
    description: { type: "text" },
    location: { type: "geography(POINT,4326)", notNull: true },
    address: { type: "varchar(500)", notNull: true },
    status: { type: "varchar(20)", notNull: true, default: "pending" },
    is_active: { type: "boolean", notNull: true, default: true },
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
  pgm.addConstraint("game_clubs", "game_clubs_status_check", {
    check: "status IN ('pending', 'approved', 'rejected')",
  });
  pgm.createIndex("game_clubs", "owner_id");
  pgm.createIndex("game_clubs", "status");
  pgm.createIndex("game_clubs", "location", { method: "gist" });
};

export const down = (pgm) => {
  pgm.dropTable("game_clubs");
};
