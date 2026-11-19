import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, roleOf, UPLOAD_DIR, MAX_FILE_SIZE, jsonError } from "@/lib/auth";
import crypto from "crypto";
import path from "path";
import fs from "fs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  // فقط دانش‌آموز تکلیف ارسال می‌کند؛ معلم/نماینده/مدیر از این مسیر ارسال نمی‌کنند
  if ((await roleOf(user.username)) !== "student")
    return jsonError("فقط دانش‌آموز می‌تواند تکلیف ارسال کند.", 403);

  const { id } = await params;
  const a = await db.assignment.findUnique({ where: { id } });
  if (!a) return jsonError("تکلیف پیدا نشد.", 404);
  if (Date.now() > a.deadline.getTime())
    return jsonError("مهلت ارسال این تکلیف گذشته است.", 403);

  const already = await db.submission.findFirst({
    where: { assignmentId: a.id, user: user.username },
  });
  if (already) return jsonError("این تکلیف را قبلاً ارسال کرده‌ای.", 409);

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const extra = (form.get("extra") as File | null) || null;
    const note = String(form.get("note") || "").slice(0, 2000);
    if (!file) return jsonError("یک فایل برای پاسخ انتخاب کن.");
    if (file.size > MAX_FILE_SIZE || (extra && extra.size > MAX_FILE_SIZE))
      return jsonError("حداکثر حجم هر فایل ۱۰۰ مگابایت است.", 413);

    const safeName = (name: string) =>
      path
        .basename(String(name || "file"))
        .replace(/[^\w.\-\u0600-\u06FF ]+/g, "_")
        .slice(0, 120);

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const fileId = crypto.randomBytes(8).toString("hex");
    fs.writeFileSync(path.join(UPLOAD_DIR, fileId), Buffer.from(await file.arrayBuffer()));

    let extraId = "";
    let extraName = "";
    if (extra && extra.size > 0) {
      extraId = crypto.randomBytes(8).toString("hex");
      fs.writeFileSync(
        path.join(UPLOAD_DIR, extraId),
        Buffer.from(await extra.arrayBuffer())
      );
      extraName = safeName(extra.name);
    }

    const subId = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    await db.submission.create({
      data: {
        id: subId,
        assignmentId: a.id,
        user: user.username,
        fileId,
        fileName: safeName(file.name),
        extraId,
        extraName,
        note,
      },
    });
    return Response.json({ ok: true });
  } catch {
    return jsonError("خطای سرور.", 500);
  }
}
