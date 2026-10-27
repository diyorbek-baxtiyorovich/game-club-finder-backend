import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { getFilterOptions, searchClubs } from "./search.controller.js";
import { searchRequestSchema } from "./search.schema.js";

export const searchRouter = Router();
searchRouter.get("/filters/options", getFilterOptions);
searchRouter.post("/search", validate(searchRequestSchema), searchClubs);
