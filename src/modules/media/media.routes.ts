import express, { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { servePublicImage } from "./media.controller.js";
import { mediaIdRequestSchema } from "./media.schema.js";

export const mediaUploadBody = express.raw({ type: () => true, limit: "8mb" });

export const mediaRouter = Router();
mediaRouter.get("/:id", validate(mediaIdRequestSchema), servePublicImage);
