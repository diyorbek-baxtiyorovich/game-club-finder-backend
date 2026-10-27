import { AppError } from "../../common/errors/app-error.js";
import type { AuthenticatedUser } from "./auth.types.js";

export function assertCanManageClub(
  actor: AuthenticatedUser,
  clubOwnerId: string,
): void {
  if (actor.role === "admin") return;
  if (actor.role !== "club_owner" || actor.id !== clubOwnerId) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Bu klubni o‘zgartirishga ruxsatingiz yo‘q.",
    );
  }
}
