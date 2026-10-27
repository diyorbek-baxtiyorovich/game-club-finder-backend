import type { PoolClient } from "pg";
import { AppError } from "../../common/errors/app-error.js";
import { databasePool } from "../../config/database.js";
import type { ReviewInput } from "./reviews.schema.js";

const scoreColumns = ["performance", "equipment", "service", "cleanliness", "comfort", "value_for_money"] as const;
const scoreValues = (input: ReviewInput) => [
  input.performance, input.equipment, input.service, input.cleanliness, input.comfort, input.valueForMoney,
];
const averageSql = "round(($3::int + $4::int + $5::int + $6::int + $7::int + $8::int)::numeric / 6)::smallint";

async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    const value = await work(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function requirePublicClub(rowCount: number | null): void {
  if (!rowCount) throw new AppError(404, "CLUB_NOT_FOUND", "Klub topilmadi.");
}

export async function listClubReviews(clubId: string, userId: string | null, page: number, limit: number) {
  const params = [clubId, userId, limit, (page - 1) * limit];
  const visibility = `(r.status = 'approved' AND r.is_flagged = false OR r.user_id = $2)`;
  const [items, count] = await Promise.all([
    databasePool.query(
      `SELECT r.id::text, r.user_id::text, r.body, r.status, r.created_at, r.updated_at,
        cr.rating, cr.performance, cr.equipment, cr.service, cr.cleanliness, cr.comfort,
        cr.value_for_money,
        (SELECT count(*)::int FROM review_helpful_votes v WHERE v.review_id = r.id) helpful_count,
        rr.body reply_body, rr.updated_at reply_updated_at
       FROM reviews r JOIN club_ratings cr ON cr.club_id = r.club_id AND cr.user_id = r.user_id
       LEFT JOIN review_replies rr ON rr.review_id = r.id
       WHERE r.club_id = $1 AND ${visibility}
       ORDER BY r.created_at DESC, r.id DESC LIMIT $3 OFFSET $4`, params,
    ),
    databasePool.query<{ total: string }>(
      `SELECT count(*)::text total FROM reviews r WHERE r.club_id = $1 AND ${visibility}`,
      [clubId, userId],
    ),
  ]);
  return {
    items: items.rows.map((row) => ({
      id: row.id,
      ownReview: userId !== null && row.user_id === userId,
      body: row.body,
      status: row.status,
      rating: {
        overall: row.performance === null ? Number(row.rating) : Number((scoreColumns.reduce((sum, key) => sum + Number(row[key]), 0) / 6).toFixed(2)),
        performance: row.performance,
        equipment: row.equipment,
        service: row.service,
        cleanliness: row.cleanliness,
        comfort: row.comfort,
        valueForMoney: row.value_for_money,
      },
      helpfulCount: row.helpful_count,
      reply: row.reply_body === null ? null : { body: row.reply_body, updatedAt: row.reply_updated_at.toISOString() },
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    })),
    total: Number(count.rows[0].total),
  };
}

export async function createReview(userId: string, clubId: string, input: ReviewInput) {
  return transaction(async (client) => {
    const club = await client.query(
      "SELECT id FROM game_clubs WHERE id = $1 AND status = 'approved' AND is_active = true FOR SHARE", [clubId],
    );
    requirePublicClub(club.rowCount ?? 0);
    const duplicate = await client.query("SELECT 1 FROM reviews WHERE club_id = $1 AND user_id = $2", [clubId, userId]);
    if (duplicate.rowCount) throw new AppError(409, "REVIEW_ALREADY_EXISTS", "Bu klub uchun izohingiz allaqachon mavjud.");
    const values = scoreValues(input);
    await client.query(
      `INSERT INTO club_ratings (club_id,user_id,rating,${scoreColumns.join(",")})
       VALUES ($1,$2,${averageSql},$3,$4,$5,$6,$7,$8)
       ON CONFLICT (user_id,club_id) DO UPDATE SET rating=EXCLUDED.rating,
         performance=EXCLUDED.performance,equipment=EXCLUDED.equipment,service=EXCLUDED.service,
         cleanliness=EXCLUDED.cleanliness,comfort=EXCLUDED.comfort,value_for_money=EXCLUDED.value_for_money,
         updated_at=current_timestamp`, [clubId, userId, ...values],
    );
    const review = await client.query<{ id: string; created_at: Date }>(
      `INSERT INTO reviews (club_id,user_id,body) VALUES ($1,$2,$3) RETURNING id::text,created_at`,
      [clubId, userId, input.body],
    );
    return { id: review.rows[0].id, clubId, status: "pending", createdAt: review.rows[0].created_at.toISOString() };
  });
}

export async function updateReview(reviewId: string, userId: string, input: ReviewInput) {
  return transaction(async (client) => {
    await client.query("SELECT set_config('app.actor_user_id', $1, true)", [userId]);
    const current = await client.query<{ club_id: string }>(
      "SELECT club_id::text FROM reviews WHERE id=$1 AND user_id=$2 FOR UPDATE", [reviewId, userId],
    );
    if (!current.rows[0]) throw new AppError(404, "REVIEW_NOT_FOUND", "Izoh topilmadi.");
    const values = scoreValues(input);
    await client.query(
      `UPDATE club_ratings SET rating=${averageSql}, performance=$3,equipment=$4,service=$5,
       cleanliness=$6,comfort=$7,value_for_money=$8,updated_at=current_timestamp
       WHERE club_id=$1 AND user_id=$2`, [current.rows[0].club_id, userId, ...values],
    );
    const updated = await client.query<{ updated_at: Date }>(
      `UPDATE reviews SET body=$3,status='pending',is_flagged=false,moderated_by=NULL,moderation_reason=NULL,
       moderated_at=NULL,updated_at=current_timestamp WHERE id=$1 AND user_id=$2 RETURNING updated_at`,
      [reviewId, userId, input.body],
    );
    return { id: reviewId, clubId: current.rows[0].club_id, status: "pending", updatedAt: updated.rows[0].updated_at.toISOString() };
  });
}

export async function deleteReview(reviewId: string, userId: string): Promise<void> {
  await transaction(async (client) => {
    const row = await client.query<{ club_id: string }>(
      "DELETE FROM reviews WHERE id=$1 AND user_id=$2 RETURNING club_id::text", [reviewId, userId],
    );
    if (!row.rows[0]) throw new AppError(404, "REVIEW_NOT_FOUND", "Izoh topilmadi.");
    await client.query("DELETE FROM club_ratings WHERE club_id=$1 AND user_id=$2", [row.rows[0].club_id, userId]);
  });
}

export async function replyToReview(reviewId: string, ownerId: string, body: string) {
  return transaction(async (client) => {
    const row = await client.query<{ club_id: string; owner_id: string }>(
      `SELECT r.club_id::text,c.owner_id::text FROM reviews r JOIN game_clubs c ON c.id=r.club_id
       WHERE r.id=$1 AND r.status='approved' AND r.is_flagged=false AND c.is_active=true FOR UPDATE OF r`, [reviewId],
    );
    if (!row.rows[0]) throw new AppError(404, "REVIEW_NOT_FOUND", "Tasdiqlangan izoh topilmadi.");
    if (row.rows[0].owner_id !== ownerId) throw new AppError(403, "FORBIDDEN", "Faqat klub egasi izohga javob bera oladi.");
    const result = await client.query<{ id: string; created_at: Date; updated_at: Date }>(
      `INSERT INTO review_replies (review_id,owner_id,body) VALUES ($1,$2,$3)
       ON CONFLICT (review_id) DO UPDATE SET body=EXCLUDED.body,updated_at=current_timestamp
       RETURNING id::text,created_at,updated_at`, [reviewId, ownerId, body],
    );
    return { id: result.rows[0].id, reviewId, body, createdAt: result.rows[0].created_at.toISOString(), updatedAt: result.rows[0].updated_at.toISOString() };
  });
}

export async function markHelpful(reviewId: string, userId: string) {
  return transaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO review_helpful_votes (review_id,user_id)
       SELECT r.id,$2 FROM reviews r WHERE r.id=$1 AND r.status='approved' AND r.is_flagged=false AND r.user_id<>$2
       ON CONFLICT (review_id,user_id) DO NOTHING`, [reviewId, userId],
    );
    const review = await client.query<{ helpful_count: number }>(
      `SELECT count(v.id)::int helpful_count FROM reviews r LEFT JOIN review_helpful_votes v ON v.review_id=r.id
       WHERE r.id=$1 AND r.status='approved' AND r.is_flagged=false AND r.user_id<>$2 GROUP BY r.id`, [reviewId, userId],
    );
    if (!review.rows[0]) throw new AppError(404, "REVIEW_NOT_FOUND", "Tasdiqlangan izoh topilmadi.");
    return { helpful: (inserted.rowCount ?? 0) > 0, helpfulCount: review.rows[0].helpful_count };
  });
}

export async function moderateReview(reviewId: string, moderatorId: string, status: "approved" | "rejected", reason?: string) {
  return transaction(async (client) => {
    await client.query("SELECT set_config('app.actor_user_id', $1, true)", [moderatorId]);
    const result = await client.query<{ id: string; status: string; moderated_at: Date }>(
      `UPDATE reviews SET status=$2,moderated_by=$3,moderation_reason=$4,moderated_at=current_timestamp,
        updated_at=current_timestamp WHERE id=$1 AND status='pending' AND (is_flagged=false OR $2='rejected')
       RETURNING id::text,status,moderated_at`, [reviewId, status, moderatorId, reason ?? null],
    );
    if (!result.rows[0]) {
      const found = await client.query("SELECT 1 FROM reviews WHERE id=$1", [reviewId]);
      if (!found.rowCount) throw new AppError(404, "REVIEW_NOT_FOUND", "Izoh topilmadi.");
      throw new AppError(409, "REVIEW_STATUS_CONFLICT", "Faqat moderatsiya kutilayotgan izohni ko‘rib chiqish mumkin.");
    }
    return { id: result.rows[0].id, status: result.rows[0].status, moderatedAt: result.rows[0].moderated_at.toISOString() };
  });
}
