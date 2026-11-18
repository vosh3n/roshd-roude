import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "@/lib/db";
import { currentUser, jsonError, errDetail } from "@/lib/auth";
import {
  MISSIONS_DIR,
  MISSION_FILE_RULES,
  MISSION_LINK_MAX,
  MISSION_TEXT_MAX,
  LINK_RE,
  isMissionKind,
  missionDto,
  validateMissionKey,
} from "@/lib/missions-server";

/**
 * GET /api/missions — ارسال‌های خودِ دانش‌آموز (همهٔ وضعیت‌ها)
 * دسترسی: فقط دانش‌آموز؛ هر کس فقط ارسال‌های خودش را می‌بیند.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (user.role !== "student")
    return Response.json({ submissions: [], role: user.role });

  const rows = await db.missionSubmission.findMany({
    where: { username: user.username },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json({ submissions: rows.map(missionDto) });
}

/**
 * POST /api/missions — ثبت یا اصلاح ارسال یک ماموریت
 * body: multipart/form-data { field, level, day, idx, kind, text?, link?, file? }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
    if (user.role !== "student")
      return jsonError("فقط حساب دانش‌آموزی می‌تواند ماموریت ارسال کند.", 403);

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return jsonError("فرم ارسال معتبر نیست.", 400);
    }

    const checked = validateMissionKey({
      field: form.get("field"),
      level: form.get("level"),
      day: form.get("day"),
      idx: form.get("idx"),
    });
    if (!checked.ok) return jsonError(checked.error, 400);
    const { key, field, level, day, idx, title } = checked;

    const kindRaw = form.get("kind");
    const kind = isMissionKind(kindRaw) ? kindRaw : "practical";

    const text = String(form.get("text") || "").trim();
    const link = String(form.get("link") || "").trim();

    if (text.length > MISSION_TEXT_MAX)
      return jsonError("متن ارسال بیش از حد طولانی است.", 413);
    if (link.length > MISSION_LINK_MAX)
      return jsonError("لینک بیش از حد طولانی است.", 413);
    if (link && !LINK_RE.test(link))
      return jsonError("لینک باید با http یا https شروع شود.", 400);

    const file = form.get("file");
    const hasFile = file instanceof File && file.size > 0;

    if (kind === "reading" && text.length < 15)
      return jsonError(
        "برای ماموریت مطالعه‌ای، خلاصهٔ خودت را بنویس (حداقل ۱۵ نویسه).",
        400
      );
    if (kind === "practical" && !hasFile && !link && text.length < 15)
      return jsonError(
        "یک فایل یا لینک بفرست، یا کارت را کمی توضیح بده (حداقل ۱۵ نویسه).",
        400
      );

    // بررسی وجود ارسال قبلی و قفل بودن ماموریت پس از تایید
    const existing = await db.missionSubmission.findUnique({
      where: { username_missionKey: { username: user.username, missionKey: key } },
    });
    if (existing?.status === "approved")
      return jsonError("این ماموریت قبلاً تایید شده است.", 409);

    // ---- آپلود فایل (اعتبارسنجی سمت سرور) ----
    let fileId = existing?.fileId || "";
    let fileName = existing?.fileName || "";
    let fileType = existing?.fileType || "";

    if (hasFile) {
      const f = file as File;
      const limit = MISSION_FILE_RULES[f.type];
      if (!limit)
        return jsonError(
          "نوع فایل مجاز نیست. عکس (JPG/PNG/WebP/GIF)، PDF یا ویدیوی کوتاه MP4/WebM بفرست.",
          415
        );
      if (f.size > limit)
        return jsonError(
          `حجم فایل بیش از حد مجاز است (حداکثر ${Math.round(limit / 1024 / 1024)} مگابایت).`,
          413
        );

      const ext =
        f.type === "application/pdf"
          ? ".pdf"
          : f.type === "video/mp4"
            ? ".mp4"
            : f.type === "video/webm"
              ? ".webm"
              : f.type === "video/quicktime"
                ? ".mov"
                : "." + (f.type.split("/")[1] || "bin").replace("jpeg", "jpg");
      const newName = crypto.randomBytes(12).toString("hex") + ext;
      fs.mkdirSync(MISSIONS_DIR, { recursive: true });
      const buf = Buffer.from(await f.arrayBuffer());
      fs.writeFileSync(path.join(MISSIONS_DIR, newName), buf);

      // فایل قبلی همان ارسال پاک شود
      if (existing?.fileId) {
        try {
          fs.unlinkSync(path.join(MISSIONS_DIR, existing.fileId));
        } catch {
          /* فایل قبلی نبود — اشکالی ندارد */
        }
      }
      fileId = newName;
      fileName = f.name.slice(0, 180) || "file";
      fileType = f.type;
    }

    const row = await db.missionSubmission.upsert({
      where: { username_missionKey: { username: user.username, missionKey: key } },
      update: {
        kind,
        title,
        text,
        link,
        fileId,
        fileName,
        fileType,
        status: "pending",
        teacherNote: "",
        reviewedAt: null,
      },
      create: {
        username: user.username,
        missionKey: key,
        field,
        level,
        day,
        idx,
        kind,
        title,
        text,
        link,
        fileId,
        fileName,
        fileType,
        status: "pending",
      },
    });

    return Response.json({ ok: true, submission: missionDto(row) });
  } catch (e) {
    console.error("[missions] POST 500:", e);
    return jsonError(`خطای سرور — ${errDetail(e)}`, 500);
  }
}
