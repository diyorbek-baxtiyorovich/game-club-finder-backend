import * as nearbyRepository from "./nearby.repository.js";
import type { NearbyQuery } from "./nearby.schema.js";

export const nearbyService = {
  async search(query: NearbyQuery) {
    if (query.lat !== undefined && query.lng !== undefined) {
      const radiusMeters = query.radius ?? 5_000;
      const result = await nearbyRepository.findNearbyByCoordinates(
        query.lat,
        query.lng,
        radiusMeters,
        query.page,
        query.limit,
      );
      return {
        ...result,
        page: query.page,
        limit: query.limit,
        searchMode: "coordinates" as const,
        radiusMeters,
      };
    }
    const result = await nearbyRepository.findNearbyByCity(
      query.city!,
      query.page,
      query.limit,
    );
    return {
      ...result,
      page: query.page,
      limit: query.limit,
      searchMode: "city" as const,
    };
  },
};
