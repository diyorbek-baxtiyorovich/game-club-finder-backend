export const up = (pgm) => {
  pgm.addColumn("game_clubs", {
    timezone: { type: "varchar(100)", notNull: true, default: "Asia/Tashkent" },
  });
  pgm.addConstraint("game_clubs", "game_clubs_timezone_not_empty", {
    check: "length(trim(timezone)) > 0",
  });
};

export const down = (pgm) => {
  pgm.dropConstraint("game_clubs", "game_clubs_timezone_not_empty");
  pgm.dropColumn("game_clubs", "timezone");
};
