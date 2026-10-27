import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { findNearbyClubs } from "./nearby.controller.js";
import { nearbyRequestSchema } from "./nearby.schema.js";

export const nearbyRouter = Router();
nearbyRouter.get("/nearby", validate(nearbyRequestSchema), findNearbyClubs);
