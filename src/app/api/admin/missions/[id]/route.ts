import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, jsonError, errDetail, isTeacher } from "@/lib/auth";
import {
  MISSION_NOTE_MAX,
  syncProgressFromMissions,
} from "@/lib/missions-server";

/**
 * POST /api/admin/missions/{id} — بررسی ارسال ماموریت توسط معلم
 * body: { action: "approve" | "revision", note?: string }
 * - approve: وضعیت «تایید شده» و افزودن ماموریت به آمار دانش‌آموز
 * - revision: وضعیت «نیاز به اصلاح» با پیام اجباری برای دانش‌آموز
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
    if (!isTeacher(user.role)) return jsonError("دسترسی معلم نداری.", 403);

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const note = String(body.note || "").trim();

    if (action !== "approve" && action !== "revision")
      return jsonError("عملیات نامعتبر است.", 400);
    if (note.length > MISSION_NOTE_MAX)
      return jsonError("پیام معلم بیش از حد طولانی است.", 413);
    if (action === "revision" && note.length < 3)
      return jsonError("برای برگشت دادن، دلیل را بنویس (حداقل ۳ نویسه).", 400);

    const row = await db.missionSubmission.findUnique({ where: { id } });
    if (!row) return jsonError("ارسال پیدا نشد.", 404);

    const updated = await db.missionSubmission.update({
      where: { id },
      data: {
        status: action === "approve" ? "approved" : "revision",
        teacherNote: note,
        reviewedAt: new Date(),
      },
    });

    // آمار دانش‌آموز فقط از ماموریت‌های تاییدشده ساخته می‌شود
    const completed = await syncProgressFromMissions(row.username);

    return Response.json({
      ok: true,
      submission: {
        id: updated.id,
        status: updated.status,
        teacherNote: updated.teacherNote,
      },
      approvedCount: Object.keys(completed).length,
    });
  } catch (e) {
    console.error("[admin/missions] POST 500:", e);
    return jsonError(`خطای سرور — ${errDetail(e)}`, 500);
  }
}
