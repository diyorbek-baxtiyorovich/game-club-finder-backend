import { databasePool } from "../../config/database.js";
import type { User } from "./user.schema.js";

interface UserRow {
  id: string;
  telegram_id: string;
  role: "user" | "club_owner" | "admin";
  created_at: Date;
  updated_at: Date;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    telegramId: row.telegram_id,
    role: row.role,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function findByTelegramId(
  telegramId: string,
): Promise<User | null> {
  const result = await databasePool.query<UserRow>(
    `SELECT id::text, telegram_id::text, role, created_at, updated_at
     FROM users WHERE telegram_id = $1`,
    [telegramId],
  );
  return result.rows[0] ? toUser(result.rows[0]) : null;
}

export async function findById(userId: string): Promise<User | null> {
  const result = await databasePool.query<UserRow>(
    `SELECT id::text, telegram_id::text, role, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId],
  );
  return result.rows[0] ? toUser(result.rows[0]) : null;
}

export async function createUser(telegramId: string): Promise<User> {
  const result = await databasePool.query<UserRow>(
    `INSERT INTO users (telegram_id) VALUES ($1)
     ON CONFLICT (telegram_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
     RETURNING id::text, telegram_id::text, role, created_at, updated_at`,
    [telegramId],
  );
  return toUser(result.rows[0]);
}
