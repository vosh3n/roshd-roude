import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, UPLOAD_DIR, jsonError } from "@/lib/auth";
import fs from "fs";
import path from "path";

/** استریم ویدیو با پشتیبانی Range برای جابه‌جایی زمان ویدیو */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);

  const { id } = await params;
  const v = await db.video.findUnique({ where: { id } });
  if (!v) return jsonError("ویدیو پیدا نشد.", 404);

  const filePath = path.join(UPLOAD_DIR, v.fileId);
  if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath))
    return jsonError("فایل پیدا نشد.", 404);

  const stat = fs.statSync(filePath);
  const type = v.type || "video/mp4";
  const range = req.headers.get("range");

  if (!range) {
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
    return new Response(readable, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(stat.size),
        "Accept-Ranges": "bytes",
      },
    });
  }

  const m = String(range).match(/bytes=(\d*)-(\d*)/);
  if (!m) return new Response(null, { status: 416 });

  const start = m[1] ? parseInt(m[1], 10) : 0;
  const end = m[2] ? parseInt(m[2], 10) : stat.size - 1;
  if (start > end || end >= stat.size)
    return new Response(null, { status: 416 });

  const stream = fs.createReadStream(filePath, { start, end });
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
    status: 206,
    headers: {
      "Content-Type": type,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
    },
  });
}
