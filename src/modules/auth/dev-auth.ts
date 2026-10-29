// Temporary local-development bypass, enabled only by AUTH_DISABLED=true
// (env.ts refuses it in production). Each role maps to one real users row so
// foreign keys (club owner, review author, favorites…) keep working.
import { AppError } from "../../common/errors/app-error.js";
import { databasePool } from "../../config/database.js";
import type { AuthenticatedUser } from "./auth.types.js";

type Role = AuthenticatedUser["role"];

const DEV_TELEGRAM_IDS: Record<Role, string> = {
  admin: "900000000001",
  club_owner: "900000000002",
  user: "900000000003",
};
export const DEFAULT_DEV_ROLE: Role = "admin";

const cache = new Map<Role, Promise<AuthenticatedUser>>();

function loadDevUser(role: Role): Promise<AuthenticatedUser> {
  const telegramId = DEV_TELEGRAM_IDS[role];
  return databasePool
    .query<{ id: string; role: Role }>(
      `WITH inserted AS (
         INSERT INTO users (telegram_id, role) VALUES ($1, $2)
         ON CONFLICT (telegram_id) DO NOTHING RETURNING id, role
       )
       SELECT id::text, role FROM inserted
       UNION ALL
       SELECT id::text, role FROM users WHERE telegram_id = $1
       LIMIT 1`,
      [telegramId, role],
    )
    .then((result) => result.rows[0]);
}

export function resolveDevUser(roleHeader: string | undefined): Promise<AuthenticatedUser> {
  const role = (roleHeader?.trim() || DEFAULT_DEV_ROLE) as Role;
  if (!(role in DEV_TELEGRAM_IDS)) {
    return Promise.reject(
      new AppError(400, "INVALID_DEV_ROLE", "X-Dev-Role faqat user, club_owner yoki admin bo‘lishi mumkin."),
    );
  }
  let user = cache.get(role);
  if (!user) {
    user = loadDevUser(role);
    cache.set(role, user);
    user.catch(() => cache.delete(role));
  }
  return user;
}
