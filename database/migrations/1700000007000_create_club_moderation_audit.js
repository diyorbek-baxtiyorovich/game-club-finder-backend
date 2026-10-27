export const up = (pgm) => {
  pgm.createTable("game_club_moderation_audit", {
    id: { type: "bigserial", primaryKey: true },
    club_id: {
      type: "bigint",
      notNull: true,
      references: "game_clubs(id)",
      onDelete: "RESTRICT",
    },
    moderator_id: {
      type: "bigint",
      notNull: true,
      references: "users(id)",
      onDelete: "RESTRICT",
    },
    old_status: { type: "varchar(20)", notNull: true },
    new_status: { type: "varchar(20)", notNull: true },
    reason: { type: "text" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint(
    "game_club_moderation_audit",
    "game_club_moderation_transition_check",
    {
      check:
        "old_status = 'pending' AND new_status IN ('approved', 'rejected')",
    },
  );
  pgm.createIndex("game_club_moderation_audit", ["club_id", "created_at"]);
  pgm.createIndex("game_club_moderation_audit", ["moderator_id", "created_at"]);
};

export const down = (pgm) => {
  pgm.dropTable("game_club_moderation_audit");
};
