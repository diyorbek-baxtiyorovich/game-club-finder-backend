export const up = (pgm) => {
  pgm.addColumn("club_ratings", {
    performance: { type: "smallint" },
    equipment: { type: "smallint" },
    service: { type: "smallint" },
    cleanliness: { type: "smallint" },
    comfort: { type: "smallint" },
    value_for_money: { type: "smallint" },
  });
  pgm.addConstraint("club_ratings", "club_ratings_criteria_check", {
    check: `(
      performance IS NULL AND equipment IS NULL AND service IS NULL AND
      cleanliness IS NULL AND comfort IS NULL AND value_for_money IS NULL
    ) OR (
      performance BETWEEN 1 AND 5 AND equipment BETWEEN 1 AND 5 AND
      service BETWEEN 1 AND 5 AND cleanliness BETWEEN 1 AND 5 AND
      comfort BETWEEN 1 AND 5 AND value_for_money BETWEEN 1 AND 5
    )`,
  });

  pgm.createTable("reviews", {
    id: { type: "bigserial", primaryKey: true },
    club_id: {
      type: "bigint", notNull: true,
      references: "game_clubs(id)", onDelete: "CASCADE",
    },
    user_id: {
      type: "bigint", notNull: true,
      references: "users(id)", onDelete: "CASCADE",
    },
    body: { type: "varchar(3000)", notNull: true },
    status: { type: "varchar(20)", notNull: true, default: "pending" },
    is_flagged: { type: "boolean", notNull: true, default: false },
    moderated_by: { type: "bigint", references: "users(id)", onDelete: "SET NULL" },
    moderation_reason: { type: "varchar(2000)" },
    moderated_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });
  pgm.addConstraint("reviews", "reviews_club_user_unique", {
    unique: ["club_id", "user_id"],
  });
  pgm.addConstraint("reviews", "reviews_rating_user_club_fk", {
    foreignKeys: {
      columns: ["club_id", "user_id"],
      references: "club_ratings(club_id, user_id)",
      onDelete: "CASCADE",
    },
  });
  pgm.addConstraint("reviews", "reviews_status_check", {
    check: "status IN ('pending', 'approved', 'rejected')",
  });
  pgm.createIndex("reviews", ["club_id", "status", "created_at"]);

  pgm.createTable("review_replies", {
    id: { type: "bigserial", primaryKey: true },
    review_id: {
      type: "bigint", notNull: true, unique: true,
      references: "reviews(id)", onDelete: "CASCADE",
    },
    owner_id: {
      type: "bigint", notNull: true,
      references: "users(id)", onDelete: "RESTRICT",
    },
    body: { type: "varchar(2000)", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.createTable("review_helpful_votes", {
    id: { type: "bigserial", primaryKey: true },
    review_id: {
      type: "bigint", notNull: true,
      references: "reviews(id)", onDelete: "CASCADE",
    },
    user_id: {
      type: "bigint", notNull: true,
      references: "users(id)", onDelete: "CASCADE",
    },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("current_timestamp") },
  });
  pgm.addConstraint("review_helpful_votes", "review_helpful_votes_review_user_unique", {
    unique: ["review_id", "user_id"],
  });
  pgm.createIndex("review_helpful_votes", ["review_id"]);
};

export const down = (pgm) => {
  pgm.dropTable("review_helpful_votes");
  pgm.dropTable("review_replies");
  pgm.dropTable("reviews");
  pgm.dropConstraint("club_ratings", "club_ratings_criteria_check");
  pgm.dropColumns("club_ratings", [
    "performance", "equipment", "service", "cleanliness", "comfort", "value_for_money",
  ]);
};
