import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";
import type { ObjectStorage } from "./storage.types.js";

const MEDIA_ROOT = resolve(process.cwd(), "var", "media");
const SAFE_KEY = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

function mediaPath(key: string): string {
  if (!SAFE_KEY.test(key))
    throw new AppError(400, "INVALID_MEDIA_KEY", "Media manzili noto‘g‘ri.");
  const path = resolve(MEDIA_ROOT, key);
  if (dirname(path) !== MEDIA_ROOT)
    throw new AppError(400, "INVALID_MEDIA_KEY", "Media manzili noto‘g‘ri.");
  return path;
}

export class LocalFileStorage implements ObjectStorage {
  private ensureDevelopmentStorage(): void {
    if (env.nodeEnv === "production") {
      throw new AppError(
        503,
        "MEDIA_STORAGE_NOT_CONFIGURED",
        "Production media saqlash xizmati sozlanmagan.",
      );
    }
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    this.ensureDevelopmentStorage();
    const path = mediaPath(key);
    await mkdir(MEDIA_ROOT, { recursive: true });
    try {
      await writeFile(path, bytes, { flag: "wx" });
    } catch (error) {
      await rm(path, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async get(key: string): Promise<Buffer> {
    this.ensureDevelopmentStorage();
    try {
      return await readFile(mediaPath(key));
    } catch {
      throw new AppError(
        503,
        "MEDIA_UNAVAILABLE",
        "Rasm faylini hozir ochib bo‘lmadi.",
      );
    }
  }

  async delete(key: string): Promise<void> {
    this.ensureDevelopmentStorage();
    await rm(mediaPath(key), { force: true });
  }
}

export const objectStorage: ObjectStorage = new LocalFileStorage();
