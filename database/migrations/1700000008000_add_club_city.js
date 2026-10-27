export const up = (pgm) => {
  pgm.addColumn("game_clubs", {
    city: { type: "varchar(120)" },
  });
  pgm.createIndex("game_clubs", pgm.func("lower(city)"), {
    name: "game_clubs_public_city_idx",
    where: "city IS NOT NULL AND status = 'approved' AND is_active = true",
  });
};

export const down = (pgm) => {
  pgm.dropIndex("game_clubs", pgm.func("lower(city)"), {
    name: "game_clubs_public_city_idx",
  });
  pgm.dropColumn("game_clubs", "city");
};
