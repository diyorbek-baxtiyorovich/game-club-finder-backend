import type { RequestHandler } from "express";
import { reviewsService } from "./reviews.service.js";
import type { ReviewInput } from "./reviews.schema.js";

export const listReviews: RequestHandler = async (request, response) => {
  const { id } = response.locals.validatedRequest.params as { id: string };
  const { page, limit } = response.locals.validatedRequest.query as { page: number; limit: number };
  const result = await reviewsService.list(id, request.auth?.id ?? null, page, limit);
  response.json({ success: true, data: result.items, meta: { page, limit, total: result.total } });
};

export const createReview: RequestHandler = async (request, response) => {
  const { id } = response.locals.validatedRequest.params as { id: string };
  const input = response.locals.validatedRequest.body as ReviewInput;
  response.status(201).json({ success: true, data: await reviewsService.create(request.auth!, id, input) });
};

export const updateReview: RequestHandler = async (request, response) => {
  const { id } = response.locals.validatedRequest.params as { id: string };
  const input = response.locals.validatedRequest.body as ReviewInput;
  response.json({ success: true, data: await reviewsService.update(request.auth!, id, input) });
};

export const deleteReview: RequestHandler = async (request, response) => {
  const { id } = response.locals.validatedRequest.params as { id: string };
  await reviewsService.remove(request.auth!, id);
  response.json({ success: true, data: { deleted: true } });
};

export const replyToReview: RequestHandler = async (request, response) => {
  const { id } = response.locals.validatedRequest.params as { id: string };
  const { body } = response.locals.validatedRequest.body as { body: string };
  response.json({ success: true, data: await reviewsService.reply(request.auth!, id, body) });
};

export const markReviewHelpful: RequestHandler = async (request, response) => {
  const { id } = response.locals.validatedRequest.params as { id: string };
  const result = await reviewsService.helpful(request.auth!, id);
  response.status(result.helpful ? 201 : 200).json({ success: true, data: result });
};

export const moderateReview: RequestHandler = async (request, response) => {
  const { id } = response.locals.validatedRequest.params as { id: string };
  const { status, reason } = response.locals.validatedRequest.body as { status: "approved" | "rejected"; reason?: string };
  response.json({ success: true, data: await reviewsService.moderate(request.auth!, id, status, reason) });
};
