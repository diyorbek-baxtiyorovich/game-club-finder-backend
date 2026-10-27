import type { RequestHandler } from "express";
import { clubsService } from "./club.service.js";
import { historyService } from "../history/history.service.js";
import { availabilityService } from "./availability.service.js";

export const listClubs: RequestHandler = async (_request, response) => {
  const query = response.locals.validatedRequest.query as Parameters<
    typeof clubsService.list
  >[0];
  const result = await clubsService.list(query);
  response.json({
    success: true,
    data: result.clubs,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
};

export const getClub: RequestHandler = async (request, response) => {
  const { params } = response.locals.validatedRequest as {
    params: { id: string };
  };
  const club = await clubsService.get(params.id);
  if (request.auth) await historyService.recordView(request.auth.id, club.id);
  response.json({ success: true, data: club });
};

export const getClubAvailability: RequestHandler = async (_request, response) => {
  const { params } = response.locals.validatedRequest as { params: { id: string } };
  response.json({ success: true, data: await availabilityService.get(params.id) });
};

export const createClub: RequestHandler = async (request, response) => {
  const { body } = response.locals.validatedRequest as {
    body: Parameters<typeof clubsService.create>[1];
  };
  const club = await clubsService.create(request.auth!, body);
  response.status(201).json({ success: true, data: club });
};

export const updateClub: RequestHandler = async (request, response) => {
  const { body, params } = response.locals.validatedRequest as {
    body: Record<string, unknown>;
    params: { id: string };
  };
  response.json({
    success: true,
    data: await clubsService.update(request.auth!, params.id, body),
  });
};

export const deleteClub: RequestHandler = async (request, response) => {
  const { params } = response.locals.validatedRequest as {
    params: { id: string };
  };
  await clubsService.remove(request.auth!, params.id);
  response.json({ success: true, data: { deleted: true } });
};
