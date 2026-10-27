import { Router } from "express";
import { AppError } from "../../common/errors/app-error.js";
import { authenticate } from "../auth/authenticate.js";
import { usersService } from "./users.service.js";

export const usersRouter = Router();

usersRouter.get("/me", authenticate, async (request, response, next) => {
  try {
    const user = await usersService.findById(request.auth!.id);
    if (!user)
      throw new AppError(401, "UNAUTHENTICATED", "Tizimga kirish talab qilinadi.");
    response.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});
