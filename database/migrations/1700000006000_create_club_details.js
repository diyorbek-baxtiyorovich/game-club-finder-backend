export const up = (pgm) => {
  pgm.addColumn("game_clubs", {
    working_hours: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
  });
  pgm.addConstraint("game_clubs", "game_clubs_working_hours_object_check", {
    check: "jsonb_typeof(working_hours) = 'object'",
  });

  pgm.createTable("club_equipment", {
    id: { type: "bigserial", primaryKey: true },
    club_id: {
      type: "bigint",
      notNull: true,
      references: "game_clubs(id)",
      onDelete: "CASCADE",
    },
    name: { type: "varchar(100)", notNull: true },
    monitor_hz: { type: "integer" },
    cpu: { type: "varchar(160)" },
    gpu: { type: "varchar(160)" },
    ram_gb: { type: "integer" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
  pgm.addConstraint("club_equipment", "club_equipment_monitor_hz_check", {
    check: "monitor_hz IS NULL OR monitor_hz BETWEEN 30 AND 1000",
  });
  pgm.addConstraint("club_equipment", "club_equipment_ram_check", {
    check: "ram_gb IS NULL OR ram_gb BETWEEN 1 AND 1024",
  });
  pgm.createIndex("club_equipment", "club_id");

  pgm.createTable("club_features", {
    id: { type: "bigserial", primaryKey: true },
    club_id: {
      type: "bigint",
      notNull: true,
      references: "game_clubs(id)",
      onDelete: "CASCADE",
    },
    category: { type: "varchar(20)", notNull: true },
    name: { type: "varchar(120)", notNull: true },
  });
  pgm.addConstraint("club_features", "club_features_category_check", {
    check: "category IN ('service', 'room_type')",
  });
  pgm.addConstraint("club_features", "club_features_unique_name", {
    unique: ["club_id", "category", "name"],
  });

  pgm.createTable("club_pricing", {
    id: { type: "bigserial", primaryKey: true },
    club_id: {
      type: "bigint",
      notNull: true,
      references: "game_clubs(id)",
      onDelete: "CASCADE",
    },
    category: { type: "varchar(20)", notNull: true },
    name: { type: "varchar(120)", notNull: true },
    hourly_price: { type: "numeric(12,2)", notNull: true },
    discount_percent: { type: "numeric(5,2)" },
    currency: { type: "char(3)", notNull: true, default: "UZS" },
  });
  pgm.addConstraint("club_pricing", "club_pricing_category_check", {
    check: "category IN ('standard', 'vip', 'console')",
  });
  pgm.addConstraint("club_pricing", "club_pricing_hourly_price_check", {
    check: "hourly_price >= 0",
  });
  pgm.addConstraint("club_pricing", "club_pricing_discount_check", {
    check: "discount_percent IS NULL OR discount_percent BETWEEN 0 AND 100",
  });
  pgm.createIndex("club_pricing", "club_id");

  pgm.createTable("club_images", {
    id: { type: "bigserial", primaryKey: true },
    club_id: {
      type: "bigint",
      notNull: true,
      references: "game_clubs(id)",
      onDelete: "CASCADE",
    },
    image_url: { type: "text", notNull: true },
    alt_text: { type: "varchar(250)" },
    sort_order: { type: "integer", notNull: true, default: 0 },
  });
  pgm.addConstraint("club_images", "club_images_sort_order_check", {
    check: "sort_order >= 0",
  });
  pgm.createIndex("club_images", ["club_id", "sort_order"]);

  pgm.createTable("club_games", {
    id: { type: "bigserial", primaryKey: true },
    club_id: {
      type: "bigint",
      notNull: true,
      references: "game_clubs(id)",
      onDelete: "CASCADE",
    },
    game_id: {
      type: "bigint",
      notNull: true,
      references: "games(id)",
      onDelete: "RESTRICT",
    },
  });
  pgm.addConstraint("club_games", "club_games_unique_pair", {
    unique: ["club_id", "game_id"],
  });
  pgm.createIndex("club_games", "game_id");
};

export const down = (pgm) => {
  pgm.dropTable("club_games");
  pgm.dropTable("club_images");
  pgm.dropTable("club_pricing");
  pgm.dropTable("club_features");
  pgm.dropTable("club_equipment");
  pgm.dropConstraint("game_clubs", "game_clubs_working_hours_object_check");
  pgm.dropColumn("game_clubs", "working_hours");
};
