import type { RequestHandler } from "express";
import { AppError } from "../../common/errors/app-error.js";
import { getPublicImage, storeClubImage, validateImage } from "./media.repository.js";
import type { MediaCategory } from "./media.schema.js";

const categories = new Set<MediaCategory>(["cover", "interior", "equipment"]);

export const uploadClubImage: RequestHandler = async (request, response) => {
  const { id: clubId } = response.locals.validatedRequest.params as { id: string };
  if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
    throw new AppError(400, "IMAGE_REQUIRED", "So‘rov tanasiga rasm faylini joylang.");
  }
  const mime = (request.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const imageMime = validateImage(request.body, mime);
  const category = request.get("x-media-category") as MediaCategory | undefined;
  if (!category || !categories.has(category)) {
    throw new AppError(400, "INVALID_MEDIA_CATEGORY", "Rasm turi cover, interior yoki equipment bo‘lishi kerak.");
  }
  const orderHeader = request.get("x-display-order");
  const displayOrder = orderHeader === undefined ? 0 : Number(orderHeader);
  if (!Number.isSafeInteger(displayOrder) || displayOrder < 0 || displayOrder > 100_000) {
    throw new AppError(400, "INVALID_DISPLAY_ORDER", "Ko‘rsatish tartibi 0 dan 100000 gacha butun son bo‘lishi kerak.");
  }
  const result = await storeClubImage(request.auth!.id, clubId, request.body, imageMime, category, displayOrder);
  response.status(201).json({ success: true, data: result });
};

export const servePublicImage: RequestHandler = async (_request, response) => {
  const { id } = response.locals.validatedRequest.params as { id: string };
  const image = await getPublicImage(id);
  response.setHeader("Content-Type", image.mimeType);
  response.setHeader("Content-Length", image.bytes.length);
  response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.send(image.bytes);
};
