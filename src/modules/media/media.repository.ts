import { randomUUID } from "node:crypto";
import { AppError } from "../../common/errors/app-error.js";
import { databasePool, withTransaction } from "../../config/database.js";
import { objectStorage } from "../../integrations/storage/local-file-storage.js";
import type { MediaCategory } from "./media.schema.js";

const MIME_INFO = {
  "image/jpeg": { extension: "jpg" },
  "image/png": { extension: "png" },
  "image/webp": { extension: "webp" },
} as const;
type ImageMime = keyof typeof MIME_INFO;

function imageMime(bytes: Buffer): ImageMime | null {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff &&
      bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) return "image/jpeg";
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length >= 45 && bytes.subarray(0, 8).equals(pngSignature) &&
      bytes.readUInt32BE(8) === 13 && bytes.toString("ascii", 12, 16) === "IHDR" &&
      bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0 &&
      bytes.toString("ascii", bytes.length - 8, bytes.length - 4) === "IEND") return "image/png";
  if (bytes.length >= 16 && bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP" && bytes.readUInt32LE(4) === bytes.length - 8 &&
      ["VP8 ", "VP8L", "VP8X"].includes(bytes.toString("ascii", 12, 16))) return "image/webp";
  return null;
}


export function validateImage(bytes: Buffer, declaredMime: string): ImageMime {
  if (!(declaredMime in MIME_INFO)) {
    throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Faqat JPEG, PNG yoki WebP rasmlar qabul qilinadi.");
  }
  const detected = imageMime(bytes);
  if (!detected || detected !== declaredMime) {
    throw new AppError(415, "INVALID_IMAGE_CONTENT", "Fayl turi uning haqiqiy tarkibiga mos kelmadi.");
  }
  return detected;
}

export async function storeClubImage(
  ownerId: string,
  clubId: string,
  bytes: Buffer,
  mime: ImageMime,
  category: MediaCategory,
  displayOrder: number,
) {
  const info = MIME_INFO[mime];
  const key = `${randomUUID()}.${info.extension}`;
  let stored = false;
  try {
    return await withTransaction(async (client) => {
      const club = await client.query<{ owner_id: string; is_active: boolean }>(
        "SELECT owner_id::text,is_active FROM game_clubs WHERE id=$1 FOR UPDATE", [clubId],
      );
      if (!club.rows[0] || !club.rows[0].is_active) throw new AppError(404, "CLUB_NOT_FOUND", "Faol klub topilmadi.");
      if (club.rows[0].owner_id !== ownerId) throw new AppError(403, "FORBIDDEN", "Faqat klub egasi rasm yuklay oladi.");
      const count = await client.query<{ total: string }>(
        "SELECT count(*)::text total FROM club_images WHERE club_id=$1", [clubId],
      );
      if (Number(count.rows[0].total) >= 20) {
        throw new AppError(409, "CLUB_IMAGE_LIMIT", "Bir klubga ko‘pi bilan 20 ta rasm yuklash mumkin.");
      }
      await objectStorage.put(key, bytes);
      stored = true;
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO club_images (club_id,image_url,image_category,display_order,sort_order,mime_type,size_bytes,storage_key)
         VALUES ($1,'',$2,$3,$3,$4,$5,$6) RETURNING id::text`,
        [clubId, category, displayOrder, mime, bytes.length, key],
      );
      const id = inserted.rows[0].id;
      const url = `/api/v1/media/${id}`;
      await client.query("UPDATE club_images SET image_url=$2 WHERE id=$1", [id, url]);
      return { id, url, category, displayOrder, mimeType: mime, sizeBytes: bytes.length };
    });
  } catch (error) {
    if (stored) await objectStorage.delete(key).catch(() => undefined);
    throw error;
  }
}

export async function getPublicImage(id: string) {
  const result = await databasePool.query<{ storage_key: string; mime_type: ImageMime }>(
    `SELECT i.storage_key,i.mime_type FROM club_images i JOIN game_clubs c ON c.id=i.club_id
     WHERE i.id=$1 AND i.storage_key IS NOT NULL AND c.status='approved' AND c.is_active=true`, [id],
  );
  if (!result.rows[0]) throw new AppError(404, "MEDIA_NOT_FOUND", "Rasm topilmadi.");
  return { mimeType: result.rows[0].mime_type, bytes: await objectStorage.get(result.rows[0].storage_key) };
}

export async function deleteClubImage(ownerId: string, clubId: string, imageId: string): Promise<void> {
  const storageKey = await withTransaction(async (client) => {
    const club = await client.query<{ owner_id: string; is_active: boolean }>(
      "SELECT owner_id::text,is_active FROM game_clubs WHERE id=$1 FOR UPDATE", [clubId],
    );
    if (!club.rows[0] || !club.rows[0].is_active) throw new AppError(404, "CLUB_NOT_FOUND", "Faol klub topilmadi.");
    if (club.rows[0].owner_id !== ownerId) throw new AppError(403, "FORBIDDEN", "Faqat klub egasi rasmni o‘chira oladi.");
    const removed = await client.query<{ storage_key: string | null }>(
      "DELETE FROM club_images WHERE id=$1 AND club_id=$2 RETURNING storage_key", [imageId, clubId],
    );
    if (!removed.rows[0]) throw new AppError(404, "MEDIA_NOT_FOUND", "Rasm topilmadi.");
    return removed.rows[0].storage_key;
  });
  // The file is removed only after the row is gone for good.
  if (storageKey) await objectStorage.delete(storageKey).catch(() => undefined);
}
