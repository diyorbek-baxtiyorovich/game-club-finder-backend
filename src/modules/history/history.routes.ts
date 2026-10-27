import { Router } from "express";
import { authenticate } from "../auth/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { listHistory } from "./history.controller.js";
import { historyListRequestSchema } from "./history.schema.js";

export const historyRouter = Router();
historyRouter.use(authenticate);
historyRouter.get("/", validate(historyListRequestSchema), listHistory);
