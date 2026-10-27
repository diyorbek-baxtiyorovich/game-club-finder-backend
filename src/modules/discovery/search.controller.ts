import type { RequestHandler } from "express";
import { searchService } from "./search.service.js";
import type { SearchBody } from "./search.schema.js";

export const searchClubs: RequestHandler = async (_request, response) => {
  const filters = response.locals.validatedRequest.body as SearchBody;
  const result = await searchService.search(filters);
  response.json({
    success: true,
    data: result.clubs,
    meta: { page: filters.page, limit: filters.limit, total: result.total },
  });
};

export const getFilterOptions: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: await searchService.filters() });
};
