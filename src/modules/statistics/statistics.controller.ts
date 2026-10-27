import type { RequestHandler } from "express";
import { statisticsService } from "./statistics.service.js";

export const getClubStatistics: RequestHandler = async (request, response) => {
  const { id } = response.locals.validatedRequest.params as { id: string };
  response.json({
    success: true,
    data: await statisticsService.club(request.auth!, id),
  });
};

export const getAdminStatistics: RequestHandler = async (
  _request,
  response,
) => {
  response.json({ success: true, data: await statisticsService.admin() });
};

export const listAuditEvents: RequestHandler = async (_request, response) => {
  const query = response.locals.validatedRequest.query as Parameters<
    typeof statisticsService.audit
  >[0];
  response.json({ success: true, data: await statisticsService.audit(query) });
};
