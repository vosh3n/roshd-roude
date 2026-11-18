import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, roleOf, UPLOAD_DIR, MAX_FILE_SIZE, jsonError } from "@/lib/auth";
import crypto from "crypto";
import path from "path";
import fs from "fs";

export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  const videos = await db.video.findMany({ orderBy: { createdAt: "asc" } });
  return Response.json({
    videos: videos.map((v) => ({ id: v.id, title: v.title })),
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if ((await roleOf(user.username)) !== "admin")
    return jsonError("دسترسی مدیر نداری.", 403);

  try {
    const form = await req.formData();
    const title = String(form.get("title") || "").trim();
    const file = form.get("file") as File | null;
    if (!title || !file)
      return jsonError("عنوان و فایل ویدیو لازم است.");
    if (file.size > MAX_FILE_SIZE)
      return jsonError("حداکثر حجم هر فایل ۱۰۰ مگابایت است.", 413);

    const id = "v_" + Date.now() + "_" + crypto.randomBytes(3).toString("hex");
    const fileId = crypto.randomBytes(8).toString("hex");
    const filename = path
      .basename(String(file.name || "file"))
      .replace(/[^\w.\-\u0600-\u06FF ]+/g, "_")
      .slice(0, 120);
    const type = file.type && file.type.startsWith("video/") ? file.type : "video/mp4";

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOAD_DIR, fileId), buf);

    await db.video.create({
      data: { id, title: title.slice(0, 160), fileId, filename, type },
    });
    return Response.json({ ok: true });
  } catch {
    return jsonError("خطای سرور.", 500);
  }
}
