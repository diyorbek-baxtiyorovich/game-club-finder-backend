import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireRoles } from "../auth/authenticate.js";
import {
  changeClubStatus,
  getClubSubmissionStatus,
  listPendingClubs,
} from "./moderation.controller.js";
import {
  changeClubStatusRequestSchema,
  clubStatusRequestSchema,
  moderationListSchema,
} from "./moderation.schema.js";
import { moderateReview } from "../reviews/reviews.controller.js";
import { reviewModerationRequestSchema } from "../reviews/reviews.schema.js";
import { getAdminStatistics, listAuditEvents } from "../statistics/statistics.controller.js";
import { auditListRequestSchema } from "../statistics/statistics.schema.js";

export const adminModerationRouter = Router();
adminModerationRouter.get("/stats", authenticate, requireRoles("admin"), getAdminStatistics);
adminModerationRouter.get("/audit", authenticate, requireRoles("admin"), validate(auditListRequestSchema), listAuditEvents);
adminModerationRouter.get(
  "/clubs/pending",
  authenticate,
  requireRoles("admin"),
  validate(moderationListSchema),
  listPendingClubs,
);
adminModerationRouter.patch(
  "/clubs/:id/status",
  authenticate,
  requireRoles("admin"),
  validate(changeClubStatusRequestSchema),
  changeClubStatus,
);
adminModerationRouter.patch(
  "/reviews/:id/status",
  authenticate,
  requireRoles("admin"),
  validate(reviewModerationRequestSchema),
  moderateReview,
);

export const clubSubmissionRouter = Router();
clubSubmissionRouter.get(
  "/:id/status",
  authenticate,
  requireRoles("club_owner", "admin"),
  validate(clubStatusRequestSchema),
  getClubSubmissionStatus,
);
