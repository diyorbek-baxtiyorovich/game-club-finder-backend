import { AppError } from "../../common/errors/app-error.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import * as repository from "./reviews.repository.js";
import type { ReviewInput } from "./reviews.schema.js";

export const reviewsService = {
  list(clubId: string, userId: string | null, page: number, limit: number) {
    return repository.listClubReviews(clubId, userId, page, limit);
  },
  create(actor: AuthenticatedUser, clubId: string, input: ReviewInput) {
    if (actor.role !== "user") throw new AppError(403, "FORBIDDEN", "Izohni faqat foydalanuvchi yoza oladi.");
    return repository.createReview(actor.id, clubId, input).catch((error: unknown) => {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        throw new AppError(409, "REVIEW_ALREADY_EXISTS", "Bu klub uchun izohingiz allaqachon mavjud.");
      }
      throw error;
    });
  },
  update(actor: AuthenticatedUser, reviewId: string, input: ReviewInput) {
    return repository.updateReview(reviewId, actor.id, input);
  },
  async remove(actor: AuthenticatedUser, reviewId: string) {
    await repository.deleteReview(reviewId, actor.id);
  },
  reply(actor: AuthenticatedUser, reviewId: string, body: string) {
    if (actor.role !== "club_owner") throw new AppError(403, "FORBIDDEN", "Javobni faqat klub egasi yoza oladi.");
    return repository.replyToReview(reviewId, actor.id, body);
  },
  helpful(actor: AuthenticatedUser, reviewId: string) {
    return repository.markHelpful(reviewId, actor.id);
  },
  moderate(actor: AuthenticatedUser, reviewId: string, status: "approved" | "rejected", reason?: string) {
    if (actor.role !== "admin") throw new AppError(403, "FORBIDDEN", "Izohlarni faqat admin moderatsiya qiladi.");
    return repository.moderateReview(reviewId, actor.id, status, reason);
  },
};
