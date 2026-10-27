import { Router } from "express";
import { authenticate, optionalAuthenticate, requireRoles } from "../auth/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  createReview, deleteReview, listReviews, markReviewHelpful, moderateReview,
  replyToReview, updateReview,
} from "./reviews.controller.js";
import {
  clubReviewsRequestSchema, createReviewRequestSchema, reviewIdRequestSchema,
  reviewModerationRequestSchema, reviewReplyRequestSchema, updateReviewRequestSchema,
} from "./reviews.schema.js";

export const clubReviewsRouter = Router();
clubReviewsRouter.get("/:id/reviews", optionalAuthenticate, validate(clubReviewsRequestSchema), listReviews);
clubReviewsRouter.post("/:id/reviews", authenticate, validate(createReviewRequestSchema), createReview);

export const reviewsRouter = Router();
reviewsRouter.put("/:id", authenticate, validate(updateReviewRequestSchema), updateReview);
reviewsRouter.delete("/:id", authenticate, validate(reviewIdRequestSchema), deleteReview);
reviewsRouter.post("/:id/reply", authenticate, requireRoles("club_owner"), validate(reviewReplyRequestSchema), replyToReview);
reviewsRouter.post("/:id/helpful", authenticate, validate(reviewIdRequestSchema), markReviewHelpful);
reviewsRouter.patch("/:id/status", authenticate, requireRoles("admin"), validate(reviewModerationRequestSchema), moderateReview);
