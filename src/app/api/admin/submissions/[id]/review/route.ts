import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  currentUser,
  roleOf,
  jsonError,
  errDetail,
  canManageAssignments,
} from "@/lib/auth";
import { cleanMultiline, cleanText } from "@/lib/sanitize";

/**
 * POST /api/admin/submissions/{id}/review — ثبت نتیجهٔ بررسی یک ارسال تکلیف
 * body: { status: "approved" | "revision", feedback?: string, grade?: string }
 * - approved: تایید ارسال
 * - revision: برگشت برای اصلاح (دلیل اجباری)
 * دسترسی: معلم، مدیر سایت و نمایندهٔ آموزشی — همهٔ بررسی‌ها سمت سرور است.
 */

const STATUSES = new Set(["approved", "revision"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
    if (!canManageAssignments(await roleOf(user.username)))
      return jsonError("دسترسی بررسی ارسال نداری.", 403);

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = String(body.status || "");
    const feedback = cleanMultiline(body.feedback, 1000);
    const grade = cleanText(body.grade, 20);

    if (!STATUSES.has(status))
      return jsonError("وضعیت بررسی نامعتبر است.", 400);
    if (status === "revision" && feedback.length < 3)
      return jsonError("برای برگشت دادن، دلیل را بنویس (حداقل ۳ نویسه).", 400);

    const row = await db.submission.findUnique({ where: { id } });
    if (!row) return jsonError("ارسال پیدا نشد.", 404);

    const updated = await db.submission.update({
      where: { id },
      data: {
        status,
        feedback,
        grade,
        reviewedAt: new Date(),
      },
    });

    return Response.json({
      ok: true,
      submission: {
        id: updated.id,
        status: updated.status,
        feedback: updated.feedback,
        grade: updated.grade,
      },
    });
  } catch (e) {
    console.error("[submissions/review] 500:", e);
    return jsonError(`خطای سرور — ${errDetail(e)}`, 500);
  }
}
