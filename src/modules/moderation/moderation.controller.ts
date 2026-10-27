import type { RequestHandler } from "express";
import { moderationService } from "./moderation.service.js";

export const listPendingClubs: RequestHandler = async (_request, response) => {
  const { page, limit } = response.locals.validatedRequest.query as {
    page: number;
    limit: number;
  };
  const result = await moderationService.listPending(page, limit);
  response.json({
    success: true,
    data: result.clubs,
    meta: { page, limit, total: result.total },
  });
};

export const changeClubStatus: RequestHandler = async (request, response) => {
  const { params, body } = response.locals.validatedRequest as {
    params: { id: string };
    body: { status: "approved" | "rejected"; reason?: string };
  };
  const result = await moderationService.changeStatus(
    request.auth!,
    params.id,
    body,
  );
  response.json({ success: true, data: result });
};

export const getClubSubmissionStatus: RequestHandler = async (
  request,
  response,
) => {
  const { params } = response.locals.validatedRequest as {
    params: { id: string };
  };
  const result = await moderationService.getSubmissionStatus(
    request.auth!,
    params.id,
  );
  response.json({ success: true, data: result });
};
