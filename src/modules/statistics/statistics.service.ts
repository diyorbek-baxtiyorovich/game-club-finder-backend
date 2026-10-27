import { AppError } from "../../common/errors/app-error.js";
import { assertCanManageClub } from "../auth/authorize.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import * as clubsRepository from "../clubs/club.repository.js";
import * as repository from "./statistics.repository.js";
import type { AuditListQuery } from "./statistics.schema.js";

export const statisticsService = {
  async club(actor: AuthenticatedUser, clubId: string) {
    const ownerId = await clubsRepository.findClubOwner(clubId);
    if (!ownerId) throw new AppError(404, "CLUB_NOT_FOUND", "Klub topilmadi.");
    assertCanManageClub(actor, ownerId);
    const stats = await repository.getClubStatistics(clubId);
    if (!stats) throw new AppError(404, "CLUB_NOT_FOUND", "Klub topilmadi.");
    return stats;
  },
  admin: repository.getAdminStatistics,
  audit: (query: AuditListQuery) => repository.listAuditEvents(query),
};
