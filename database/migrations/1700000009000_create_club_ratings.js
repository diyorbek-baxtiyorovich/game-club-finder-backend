export const up = (pgm) => {
  pgm.createTable("club_ratings", {
    id: { type: "bigserial", primaryKey: true },
    club_id: {
      type: "bigint",
      notNull: true,
      references: "game_clubs(id)",
      onDelete: "RESTRICT",
    },
    user_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
    },
    rating: { type: "smallint", notNull: true },
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
  pgm.addConstraint("club_ratings", "club_ratings_value_check", {
    check: "rating BETWEEN 1 AND 5",
  });
  pgm.addConstraint("club_ratings", "club_ratings_user_club_unique", {
    unique: ["user_id", "club_id"],
  });
  pgm.createIndex("club_ratings", ["club_id", "rating"]);
};

export const down = (pgm) => {
  pgm.dropTable("club_ratings");
};
