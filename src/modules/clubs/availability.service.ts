import { AppError } from "../../common/errors/app-error.js";
import * as repository from "./availability.repository.js";
import { isOpenAt } from "./availability.js";

export const availabilityService = {
  async get(clubId: string) {
    const availability = await repository.findPublicAvailability(clubId);
    if (!availability)
      throw new AppError(404, "CLUB_NOT_FOUND", "Klub topilmadi.");
    return {
      isOpenNow: isOpenAt(availability.workingHours, availability.timezone, new Date()),
      occupancy: "unknown" as const,
      timezone: availability.timezone,
    };
  },
};
