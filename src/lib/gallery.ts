/**
 * گالری مدرسه — ذخیره‌سازی عکس‌ها روی دیسک در مسیر ثابت پروژه.
 * فقط jpg/png/webp، حداکثر ۵ مگابایت، نام فایل تصادفی و امن.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

/** پوشهٔ ثابت عکس‌ها داخل پروژه — اگر نباشد ساخته می‌شود */
export const GALLERY_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "gallery"
);

export const GALLERY_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_GALLERY_SIZE = 5 * 1024 * 1024;

const SAFE_NAME = /^[a-f0-9]{20,40}\.(jpg|png|webp)$/;

export function isSafeGalleryName(name: string) {
  return SAFE_NAME.test(name);
}

/** آدرس عمومی عکس (از مسیر API، تا آپلودهای زمان اجرا هم سرو شوند) */
export function galleryUrl(name: string) {
  return name ? "/api/gallery/file/" + encodeURIComponent(name) : "";
}

/** بررسی نوع و حجم عکس قبل از هر نوشتن روی دیسک یا دیتابیس */
export function assertGalleryFile(file: File) {
  if (!GALLERY_TYPES[file.type])
    throw new Error("فقط عکس JPG، PNG یا WebP مجاز است.");
  if (file.size > MAX_GALLERY_SIZE)
    throw new Error("حجم هر عکس باید کمتر از ۵ مگابایت باشد.");
  if (!file.size) throw new Error("فایل خالی است.");
}

/** ذخیرهٔ یک عکس و برگرداندن نام فایل امن؛ در خطا throw می‌کند */
export async function saveGalleryImageAsync(file: File): Promise<string> {
  assertGalleryFile(file);
  const ext = GALLERY_TYPES[file.type];

  fs.mkdirSync(GALLERY_DIR, { recursive: true });
  const name = crypto.randomBytes(16).toString("hex") + "." + ext;
  fs.writeFileSync(
    path.join(GALLERY_DIR, name),
    Buffer.from(await file.arrayBuffer())
  );
  return name;
}

/** حذف فایل عکس (اگر بود) — نام فقط در قالب امن پذیرفته می‌شود */
export function deleteGalleryFile(name?: string | null) {
  if (!name || !isSafeGalleryName(name)) return;
  try {
    const p = path.join(GALLERY_DIR, name);
    if (p.startsWith(GALLERY_DIR) && fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    /* فایل نبود یا حذف نشد — ادامه می‌دهیم */
  }
}

/** مسیر فایل برای خواندن؛ نام باید از قبل با isSafeGalleryName چک شده باشد */
export function galleryFilePath(name: string) {
  return path.join(GALLERY_DIR, name);
}

/** نوع محتوا از پسوند فایل */
export function galleryMime(name: string) {
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
