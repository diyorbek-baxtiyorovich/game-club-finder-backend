import type { PoolClient } from "pg";
import { AppError } from "../../common/errors/app-error.js";
import { databasePool } from "../../config/database.js";

export type ClubStatus = "pending" | "approved" | "rejected";

export interface PendingClub {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  address: string;
  createdAt: string;
}

export interface SubmissionStatus {
  id: string;
  status: ClubStatus;
  submittedAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reason: string | null;
}

async function transaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listPendingClubs(
  page: number,
  limit: number,
): Promise<{ clubs: PendingClub[]; total: number }> {
  const offset = (page - 1) * limit;
  const [clubs, count] = await Promise.all([
    databasePool.query<{
      id: string;
      owner_id: string;
      name: string;
      slug: string;
      address: string;
      created_at: Date;
    }>(
      `SELECT id::text, owner_id::text, name, slug, address, created_at FROM game_clubs
       WHERE status = 'pending' AND is_active = true
       ORDER BY created_at ASC, id ASC LIMIT $1 OFFSET $2`,
      [limit, offset],
    ),
    databasePool.query<{ total: string }>(
      "SELECT count(*)::text AS total FROM game_clubs WHERE status = 'pending' AND is_active = true",
    ),
  ]);
  return {
    clubs: clubs.rows.map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      slug: row.slug,
      address: row.address,
      createdAt: row.created_at.toISOString(),
    })),
    total: Number(count.rows[0].total),
  };
}

export async function changePendingClubStatus(
  clubId: string,
  moderatorId: string,
  status: Exclude<ClubStatus, "pending">,
  reason?: string,
): Promise<{ id: string; status: ClubStatus; updatedAt: string }> {
  return transaction(async (client) => {
    await client.query("SELECT set_config('app.actor_user_id', $1, true)", [moderatorId]);
    const current = await client.query<{ status: ClubStatus }>(
      "SELECT status FROM game_clubs WHERE id = $1 AND is_active = true FOR UPDATE",
      [clubId],
    );
    if (!current.rows[0])
      throw new AppError(404, "CLUB_NOT_FOUND", "Klub topilmadi.");
    if (current.rows[0].status !== "pending") {
      throw new AppError(
        409,
        "CLUB_STATUS_CONFLICT",
        "Faqat tekshiruv kutayotgan klublar ko‘rib chiqilishi mumkin.",
      );
    }
    const changed = await client.query<{
      id: string;
      status: ClubStatus;
      updated_at: Date;
    }>(
      `UPDATE game_clubs SET status = $2, updated_at = current_timestamp WHERE id = $1
       RETURNING id::text, status, updated_at`,
      [clubId, status],
    );
    await client.query(
      `INSERT INTO game_club_moderation_audit
       (club_id, moderator_id, old_status, new_status, reason)
       VALUES ($1, $2, 'pending', $3, $4)`,
      [clubId, moderatorId, status, reason ?? null],
    );
    return {
      id: changed.rows[0].id,
      status: changed.rows[0].status,
      updatedAt: changed.rows[0].updated_at.toISOString(),
    };
  });
}

export async function findClubSubmissionStatus(
  clubId: string,
): Promise<{ ownerId: string; submission: SubmissionStatus } | null> {
  const result = await databasePool.query<{
    id: string;
    owner_id: string;
    status: ClubStatus;
    created_at: Date;
    updated_at: Date;
    reviewed_at: Date | null;
    reason: string | null;
  }>(
    `SELECT c.id::text, c.owner_id::text, c.status, c.created_at, c.updated_at,
       audit.created_at AS reviewed_at, audit.reason
     FROM game_clubs c
     LEFT JOIN LATERAL (
       SELECT created_at, reason FROM game_club_moderation_audit
       WHERE club_id = c.id ORDER BY created_at DESC, id DESC LIMIT 1
     ) audit ON true
     WHERE c.id = $1 AND c.is_active = true`,
    [clubId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ownerId: row.owner_id,
    submission: {
      id: row.id,
      status: row.status,
      submittedAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      reviewedAt: row.reviewed_at?.toISOString() ?? null,
      reason: row.reason,
    },
  };
}
