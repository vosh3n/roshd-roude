import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, UPLOAD_DIR, roleOf, jsonError } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);

  const { id } = await params;
  const s = await db.submission.findUnique({ where: { id } });
  if (!s) return jsonError("ارسال پیدا نشد.", 404);
  const role = await roleOf(user.username);
  if (s.user !== user.username && role !== "admin" && role !== "parent")
    return jsonError("دسترسی به این فایل نداری.", 403);

  const which = req.nextUrl.searchParams.get("extra") === "1" ? "extraId" : "fileId";
  const fileId = which === "extraId" ? s.extraId : s.fileId;
  if (!fileId) return jsonError("فایل پیدا نشد.", 404);

  const filePath = path.join(UPLOAD_DIR, fileId);
  if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath))
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
  const fileName = which === "extraId" ? s.extraName : s.fileName;
  return new Response(readable, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
