import { Router } from "express";
import {
  authenticate,
  optionalAuthenticate,
  requireRoles,
} from "../auth/authenticate.js";
import { validate } from "../../middleware/validate.js";
import {
  createClub,
  deleteClub,
  getClub,
  getClubAvailability,
  listClubs,
  updateClub,
} from "./club.controller.js";
import {
  clubDetailRequestSchema,
  clubsListRequestSchema,
  createClubRequestSchema,
  updateClubRequestSchema,
} from "./club.schema.js";
import { removeClubImage, uploadClubImage } from "../media/media.controller.js";
import { mediaClubIdRequestSchema, mediaClubImageRequestSchema } from "../media/media.schema.js";
import { mediaUploadBody } from "../media/media.routes.js";
import { getClubStatistics } from "../statistics/statistics.controller.js";
import { clubStatisticsRequestSchema } from "../statistics/statistics.schema.js";

export const clubsRouter = Router();

clubsRouter.get("/", validate(clubsListRequestSchema), listClubs);
clubsRouter.get(
  "/:id/availability",
  validate(clubDetailRequestSchema),
  getClubAvailability,
);
clubsRouter.get(
  "/:id/stats",
  authenticate,
  requireRoles("club_owner", "admin"),
  validate(clubStatisticsRequestSchema),
  getClubStatistics,
);
clubsRouter.post(
  "/:id/images",
  authenticate,
  requireRoles("club_owner"),
  validate(mediaClubIdRequestSchema),
  mediaUploadBody,
  uploadClubImage,
);
clubsRouter.delete(
  "/:id/images/:imageId",
  authenticate,
  requireRoles("club_owner"),
  validate(mediaClubImageRequestSchema),
  removeClubImage,
);
clubsRouter.get(
  "/:id",
  optionalAuthenticate,
  validate(clubDetailRequestSchema),
  getClub,
);
clubsRouter.post(
  "/",
  authenticate,
  requireRoles("club_owner", "admin"),
  validate(createClubRequestSchema),
  createClub,
);
clubsRouter.put(
  "/:id",
  authenticate,
  requireRoles("club_owner", "admin"),
  validate(updateClubRequestSchema),
  updateClub,
);
clubsRouter.delete(
  "/:id",
  authenticate,
  requireRoles("club_owner", "admin"),
  validate(clubDetailRequestSchema),
  deleteClub,
);
