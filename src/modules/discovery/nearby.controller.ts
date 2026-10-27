import type { RequestHandler } from "express";
import { nearbyService } from "./nearby.service.js";
import type { NearbyQuery } from "./nearby.schema.js";

export const findNearbyClubs: RequestHandler = async (_request, response) => {
  const query = response.locals.validatedRequest.query as NearbyQuery;
  const result = await nearbyService.search(query);
  response.json({
    success: true,
    data: result.clubs,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      searchMode: result.searchMode,
      ...(result.searchMode === "coordinates"
        ? { radiusMeters: result.radiusMeters }
        : {}),
    },
  });
};
