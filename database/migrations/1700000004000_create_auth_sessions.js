export const up = (pgm) => {
  pgm.createTable("auth_sessions", {
    id: { type: "uuid", primaryKey: true },
    family_id: { type: "uuid", notNull: true },
    user_id: {
      type: "bigint",
      notNull: true,
      references: "users",
      onDelete: "CASCADE",
    },
    refresh_token_hash: { type: "char(64)", notNull: true, unique: true },
    expires_at: { type: "timestamptz", notNull: true },
    revoked_at: { type: "timestamptz" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.createIndex("auth_sessions", "family_id");
  pgm.createIndex("auth_sessions", ["user_id", "revoked_at"]);
};

export const down = (pgm) => {
  pgm.dropTable("auth_sessions");
};
