import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { currentUser, jsonError } from "@/lib/auth";
import { MISSIONS_DIR } from "@/lib/missions-server";

/**
 * GET /api/missions/{id}/file — فایل ارسالی یک ماموریت
 * دسترسی: صاحب ارسال یا معلم (admin). بقیه ۴۰۳ می‌گیرند.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);

  const { id } = await params;
  const row = await db.missionSubmission.findUnique({ where: { id } });
  if (!row) return jsonError("ارسال پیدا نشد.", 404);
  if (row.username !== user.username && user.role !== "admin")
    return jsonError("دسترسی به این فایل نداری.", 403);
  if (!row.fileId) return jsonError("فایل پیدا نشد.", 404);

  const filePath = path.join(MISSIONS_DIR, row.fileId);
  if (!filePath.startsWith(MISSIONS_DIR) || !fs.existsSync(filePath))
    return jsonError("فایل پیدا نشد.", 404);

  const stream = fs.createReadStream(filePath);
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

  // عکس و ویدیو در مرورگر نمایش داده شوند؛ PDF و بقیه دانلود
  const inline =
    req.nextUrl.searchParams.get("inline") === "1" &&
    /^image\/|^video\//.test(row.fileType || "");

  return new Response(readable, {
    headers: {
      "Content-Type": row.fileType || "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(
        row.fileName || "file"
      )}`,
      "Cache-Control": "private, no-store",
    },
  });
}
