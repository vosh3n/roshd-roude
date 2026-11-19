import { NextRequest } from "next/server";
import fs from "fs";
import { currentUser, jsonError } from "@/lib/auth";
import {
  galleryFilePath,
  galleryMime,
  isSafeGalleryName,
} from "@/lib/gallery";

/**
 * GET /api/gallery/file/{file} — سرو عکس گالری از دیسک
 * فقط نام‌های تصادفی امن پذیرفته می‌شوند و ورود الزامی است.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (user.role === "educational_rep")
    return jsonError("نمایندهٔ آموزشی به گالری دسترسی ندارد.", 403);

  const { file } = await params;
  if (!isSafeGalleryName(file)) return jsonError("عکس پیدا نشد.", 404);

  const p = galleryFilePath(file);
  if (!fs.existsSync(p)) return jsonError("عکس پیدا نشد.", 404);

  const stream = fs.createReadStream(p);
  const readable = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (e) => controller.error(e));
    },
    cancel() {
      stream.destroy();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": galleryMime(file),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
