export const up = (pgm) => {
  pgm.createTable("favorites", {
    id: { type: "bigserial", primaryKey: true },
    user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    club_id: {
      type: "bigint",
      notNull: true,
      references: "game_clubs(id)",
      onDelete: "CASCADE",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint("favorites", "favorites_user_club_unique", {
    unique: ["user_id", "club_id"],
  });
  pgm.createIndex("favorites", ["user_id", "created_at", "club_id"]);

  pgm.createTable("view_history", {
    id: { type: "bigserial", primaryKey: true },
    user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    club_id: {
      type: "bigint",
      notNull: true,
      references: "game_clubs(id)",
      onDelete: "CASCADE",
    },
    first_viewed_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    last_viewed_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    view_count: { type: "integer", notNull: true, default: 1 },
  });
  pgm.addConstraint("view_history", "view_history_user_club_unique", {
    unique: ["user_id", "club_id"],
  });
  pgm.addConstraint("view_history", "view_history_view_count_positive", {
    check: "view_count > 0",
  });
  pgm.createIndex("view_history", ["user_id", "last_viewed_at", "club_id"]);
};

export const down = (pgm) => {
  pgm.dropTable("view_history");
  pgm.dropTable("favorites");
};
