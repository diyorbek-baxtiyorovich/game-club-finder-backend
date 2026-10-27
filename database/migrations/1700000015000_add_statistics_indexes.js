export const up = (pgm) => {
  pgm.createIndex("favorites", "club_id", { name: "favorites_club_id_stats_idx" });
  pgm.createIndex("view_history", "club_id", { name: "view_history_club_id_stats_idx" });
  pgm.createIndex("view_history", ["last_viewed_at", "user_id"], { name: "view_history_activity_stats_idx" });
  pgm.createIndex("favorites", ["created_at", "user_id"], { name: "favorites_activity_stats_idx" });
  pgm.createIndex("reviews", ["updated_at", "user_id"], { name: "reviews_activity_stats_idx" });
  pgm.createIndex("auth_sessions", ["created_at", "user_id"], { name: "auth_sessions_activity_stats_idx" });
  pgm.createIndex("game_clubs", "created_at", { name: "game_clubs_created_stats_idx" });
};

export const down = (pgm) => {
  pgm.dropIndex("game_clubs", "created_at", { name: "game_clubs_created_stats_idx" });
  pgm.dropIndex("auth_sessions", ["created_at", "user_id"], { name: "auth_sessions_activity_stats_idx" });
  pgm.dropIndex("reviews", ["updated_at", "user_id"], { name: "reviews_activity_stats_idx" });
  pgm.dropIndex("favorites", ["created_at", "user_id"], { name: "favorites_activity_stats_idx" });
  pgm.dropIndex("view_history", ["last_viewed_at", "user_id"], { name: "view_history_activity_stats_idx" });
  pgm.dropIndex("view_history", "club_id", { name: "view_history_club_id_stats_idx" });
  pgm.dropIndex("favorites", "club_id", { name: "favorites_club_id_stats_idx" });
};
