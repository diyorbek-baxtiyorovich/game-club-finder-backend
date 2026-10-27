import type { RequestHandler } from "express";
import { historyService } from "./history.service.js";
import type { HistoryListQuery } from "./history.schema.js";

export const listHistory: RequestHandler = async (request, response) => {
  const query = response.locals.validatedRequest.query as HistoryListQuery;
  const result = await historyService.list(request.auth!.id, query);
  response.json({ success: true, data: result.items, meta: { page: result.page, limit: result.limit, total: result.total } });
};
