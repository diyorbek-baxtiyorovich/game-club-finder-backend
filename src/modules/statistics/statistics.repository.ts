import { databasePool } from "../../config/database.js";
import type { AuditListQuery } from "./statistics.schema.js";

export async function getClubStatistics(clubId: string) {
  const result = await databasePool.query<{
    retained_view_count: string;
    retained_viewer_count: string;
    rating_count: string;
    rating_avg: string | null;
    favorite_count: string;
  }>(
    `SELECT
       (SELECT COALESCE(sum(h.view_count),0)::text FROM view_history h WHERE h.club_id=c.id) retained_view_count,
       (SELECT count(*)::text FROM view_history h WHERE h.club_id=c.id) retained_viewer_count,
       (SELECT count(*)::text FROM club_ratings r WHERE r.club_id=c.id
          AND NOT EXISTS (SELECT 1 FROM reviews rv WHERE rv.club_id=r.club_id AND rv.user_id=r.user_id
            AND (rv.status <> 'approved' OR rv.is_flagged=true))) rating_count,
       (SELECT avg(CASE WHEN r.performance IS NULL THEN r.rating::numeric
          ELSE (r.performance+r.equipment+r.service+r.cleanliness+r.comfort+r.value_for_money)::numeric/6 END)::text
          FROM club_ratings r WHERE r.club_id=c.id
            AND NOT EXISTS (SELECT 1 FROM reviews rv WHERE rv.club_id=r.club_id AND rv.user_id=r.user_id
              AND (rv.status <> 'approved' OR rv.is_flagged=true))) rating_avg,
       (SELECT count(*)::text FROM favorites f WHERE f.club_id=c.id) favorite_count
     FROM game_clubs c WHERE c.id=$1 AND c.is_active=true`,
    [clubId],
  );
  const row = result.rows[0];
  return row ? {
    storedHistoryViewCount: Number(row.retained_view_count),
    storedHistoryViewerCount: Number(row.retained_viewer_count),
    ratingCount: Number(row.rating_count),
    ratingAvg: row.rating_avg === null ? null : Number(row.rating_avg),
    favoriteCount: Number(row.favorite_count),
  } : null;
}

export async function getAdminStatistics() {
  const [clubs, users, usage] = await Promise.all([
    databasePool.query<{ total: string; pending: string; approved: string; rejected: string; new_30_days: string }>(
      `SELECT count(*) FILTER (WHERE is_active)::text total,
        count(*) FILTER (WHERE is_active AND status='pending')::text pending,
        count(*) FILTER (WHERE is_active AND status='approved')::text approved,
        count(*) FILTER (WHERE is_active AND status='rejected')::text rejected,
        count(*) FILTER (WHERE is_active AND created_at >= current_timestamp - interval '30 days')::text new_30_days
       FROM game_clubs`,
    ),
    databasePool.query<{ total: string; active_30_days: string }>(
      `SELECT (SELECT count(*) FROM users)::text total,
        (SELECT count(DISTINCT user_id) FROM (
          SELECT user_id FROM view_history WHERE last_viewed_at >= current_timestamp - interval '30 days'
          UNION SELECT user_id FROM favorites WHERE created_at >= current_timestamp - interval '30 days'
          UNION SELECT user_id FROM reviews WHERE updated_at >= current_timestamp - interval '30 days'
          UNION SELECT user_id FROM auth_sessions WHERE created_at >= current_timestamp - interval '30 days'
        ) activity)::text active_30_days`,
    ),
    databasePool.query<{ retained_views: string; retained_viewers: string; favorites: string; approved_reviews: string }>(
      `SELECT
        (SELECT COALESCE(sum(view_count),0)::text FROM view_history) retained_views,
        (SELECT count(*)::text FROM view_history) retained_viewers,
        (SELECT count(*)::text FROM favorites) favorites,
        (SELECT count(*)::text FROM reviews WHERE status='approved' AND is_flagged=false) approved_reviews`,
    ),
  ]);
  const c = clubs.rows[0];
  const u = users.rows[0];
  const s = usage.rows[0];
  return {
    clubs: { totalActive: Number(c.total), pending: Number(c.pending), approved: Number(c.approved), rejected: Number(c.rejected), newLast30Days: Number(c.new_30_days) },
    users: { total: Number(u.total), activeLast30Days: Number(u.active_30_days) },
    usage: { storedHistoryViewCount: Number(s.retained_views), storedHistoryViewerCount: Number(s.retained_viewers), favoriteCount: Number(s.favorites), approvedReviewCount: Number(s.approved_reviews) },
  };
}

export async function listAuditEvents(query: AuditListQuery) {
  const result = await databasePool.query<{
    id: string;
    actor_id: string | null;
    entity_type: string;
    entity_id: string;
    action: string;
    changed_fields: string[];
    metadata: Record<string, unknown>;
    created_at: Date;
  }>(
    `SELECT id::text, actor_id::text, entity_type, entity_id, action, changed_fields, metadata, created_at
     FROM audit_events ORDER BY audit_events.id DESC LIMIT $1`, [query.limit],
  );
  return result.rows.map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    changedFields: row.changed_fields,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
  }));
}
