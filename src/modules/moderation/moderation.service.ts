import { AppError } from "../../common/errors/app-error.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { assertCanManageClub } from "../auth/authorize.js";
import * as repository from "./moderation.repository.js";
import type { ModerationStatusInput } from "./moderation.schema.js";

export const moderationService = {
  async listPending(page: number, limit: number) {
    const result = await repository.listPendingClubs(page, limit);
    return { ...result, page, limit };
  },

  async changeStatus(
    actor: AuthenticatedUser,
    clubId: string,
    input: ModerationStatusInput,
  ) {
    if (actor.role !== "admin") {
      throw new AppError(403, "FORBIDDEN", "Klublarni faqat admin tekshira oladi.");
    }
    return repository.changePendingClubStatus(
      clubId,
      actor.id,
      input.status,
      input.reason,
    );
  },

  async getSubmissionStatus(actor: AuthenticatedUser, clubId: string) {
    const result = await repository.findClubSubmissionStatus(clubId);
    if (!result)
      throw new AppError(404, "CLUB_NOT_FOUND", "Klub topilmadi.");
    assertCanManageClub(actor, result.ownerId);
    return result.submission;
  },
};
