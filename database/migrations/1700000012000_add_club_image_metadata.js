export const up = (pgm) => {
  pgm.addColumns("club_images", {
    image_category: { type: "varchar(20)", notNull: true, default: "interior" },
    display_order: { type: "integer", notNull: true, default: 0 },
    mime_type: { type: "varchar(50)" },
    size_bytes: { type: "integer" },
    storage_key: { type: "varchar(80)" },
  });
  pgm.sql("UPDATE club_images SET display_order = sort_order");
  pgm.addConstraint("club_images", "club_images_category_check", {
    check: "image_category IN ('cover', 'interior', 'equipment')",
  });
  pgm.addConstraint("club_images", "club_images_display_order_check", {
    check: "display_order >= 0",
  });
  pgm.addConstraint("club_images", "club_images_size_bytes_check", {
    check: "size_bytes IS NULL OR size_bytes BETWEEN 1 AND 8388608",
  });
  pgm.addConstraint("club_images", "club_images_storage_metadata_check", {
    check: `(storage_key IS NULL AND mime_type IS NULL AND size_bytes IS NULL)
      OR (storage_key IS NOT NULL AND mime_type IN ('image/jpeg', 'image/png', 'image/webp') AND size_bytes IS NOT NULL)`,
  });
  pgm.addConstraint("club_images", "club_images_storage_key_unique", { unique: ["storage_key"] });
  pgm.createIndex("club_images", ["club_id", "image_category", "display_order"]);
};

export const down = (pgm) => {
  pgm.dropConstraint("club_images", "club_images_storage_key_unique");
  pgm.dropConstraint("club_images", "club_images_storage_metadata_check");
  pgm.dropConstraint("club_images", "club_images_size_bytes_check");
  pgm.dropConstraint("club_images", "club_images_display_order_check");
  pgm.dropConstraint("club_images", "club_images_category_check");
  pgm.dropColumns("club_images", ["image_category", "display_order", "mime_type", "size_bytes", "storage_key"]);
};
