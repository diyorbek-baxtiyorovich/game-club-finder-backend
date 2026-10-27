import { AppError } from "../../common/errors/app-error.js";
import { assertCanManageClub } from "../auth/authorize.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import * as repository from "./club.repository.js";
import type { Club, ClubInput } from "./club.schema.js";

function translateDatabaseError(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  ) {
    if ("constraint" in error && error.constraint === "game_clubs_slug_key") {
      throw new AppError(
        409,
        "CLUB_SLUG_CONFLICT",
        "Bu slug bilan klub allaqachon mavjud.",
      );
    }
    throw new AppError(
      409,
      "CLUB_PROFILE_DUPLICATE",
      "Klub ma’lumotlarida takroriy qiymatlar bor.",
    );
  }
  throw error;
}

async function manage(actor: AuthenticatedUser, id: string): Promise<void> {
  const ownerId = await repository.findClubOwner(id);
  if (!ownerId) throw new AppError(404, "CLUB_NOT_FOUND", "Klub topilmadi.");
  assertCanManageClub(actor, ownerId);
}

export const clubsService = {
  async list(
    query: import("./club.schema.js").ClubListQuery,
  ): Promise<{ clubs: Club[]; page: number; limit: number; total: number }> {
    const result = await repository.listPublicClubs(query);
    return { ...result, page: query.page, limit: query.limit };
  },
  async get(id: string): Promise<Club> {
    const club = await repository.findPublicClub(id);
    if (!club) throw new AppError(404, "CLUB_NOT_FOUND", "Klub topilmadi.");
    return club;
  },
  async create(actor: AuthenticatedUser, input: ClubInput): Promise<Club> {
    try {
      return await repository.insertClubProfile(actor.id, input);
    } catch (error) {
      translateDatabaseError(error);
    }
  },
  async update(
    actor: AuthenticatedUser,
    id: string,
    input: Record<string, unknown>,
  ): Promise<Club> {
    await manage(actor, id);
    try {
      return await repository.updateClubProfile(id, actor.id, input);
    } catch (error) {
      translateDatabaseError(error);
    }
  },
  async remove(actor: AuthenticatedUser, id: string): Promise<void> {
    await manage(actor, id);
    await repository.softDeleteClub(id, actor.id);
  },
};
