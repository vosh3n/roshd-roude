import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  currentUser,
  roleOf,
  jsonError,
  canManageAssignments,
  isEducationalRep,
} from "@/lib/auth";
import { classOfRep, classOfStudent, studentAssignmentWhere } from "@/lib/classes";
import { cleanText, cleanMultiline } from "@/lib/sanitize";

/**
 * GET  /api/assignments — تکالیف قابل‌دیدن برای کاربر جاری
 *   دانش‌آموز: تکالیف کلاس خودش + تکالیف قدیمی بدون کلاس
 *   نمایندهٔ آموزشی: فقط تکالیف کلاس خودش
 *   معلم / مدیر سایت: همهٔ کلاس‌ها (با فیلتر اختیاری ?classId=)
 * POST /api/assignments — ساخت تکلیف (معلم، مدیر سایت، نماینده)
 */
export async function GET(req?: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);

  const role = await roleOf(user.username);
  let where: Record<string, unknown> = {};

  if (role === "student") {
    where = studentAssignmentWhere(await classOfStudent(user.username));
  } else if (isEducationalRep(role)) {
    const classId = await classOfRep(user.username);
    if (!classId) return Response.json({ assignments: [], role });
    where = { classId };
  } else if (role === "parent") {
    return jsonError("این بخش برای نقش شما در دسترس نیست.", 403);
  } else {
    const filter = req?.nextUrl.searchParams.get("classId") || "";
    if (filter) where = { classId: filter };
  }

  const assignments = await db.assignment.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      class: { select: { id: true, name: true } },
      submissions: {
        where: { user: user.username },
        orderBy: { at: "asc" },
        take: 1,
      },
    },
    take: 500,
  });

  return Response.json({
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience || "",
      classId: a.classId || "",
      className: a.class?.name || "",
      deadline: a.deadline.toISOString(),
      expired: Date.now() > a.deadline.getTime(),
      mine: a.submissions[0]
        ? {
            fileName: a.submissions[0].fileName,
            note: a.submissions[0].note,
            status: a.submissions[0].status || "pending",
            feedback: a.submissions[0].feedback || "",
            grade: a.submissions[0].grade || "",
            at: a.submissions[0].at.toISOString(),
          }
        : null,
    })),
    role,
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  const role = await roleOf(user.username);
  if (!canManageAssignments(role))
    return jsonError("دسترسی ساخت تکلیف نداری.", 403);

  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    const text = String(body.body || "").trim();
    const deadline = String(body.deadline || "");
    const audience = cleanText(body.audience, 80);
    if (!title || !text || !deadline || Number.isNaN(new Date(deadline).getTime()))
      return jsonError("عنوان، توضیحات و مهلت معتبر لازم است.");

    /* نماینده فقط برای کلاس خودش و اجباراً با کلاس خودش */
    let classId: string | null = null;
    if (isEducationalRep(role)) {
      classId = await classOfRep(user.username);
      if (!classId)
        return jsonError(
          "هنوز کلاسی برای مسئولیت تو تعیین نشده؛ با مدیر سایت تماس بگیر.",
          403
        );
    } else {
      const requested = cleanText(body.classId, 40);
      if (requested) {
        const cls = await db.schoolClass.findUnique({
          where: { id: requested },
          select: { id: true, active: true },
        });
        if (!cls) return jsonError("کلاس پیدا نشد.", 404);
        if (!cls.active) return jsonError("این کلاس غیرفعال است.", 400);
        classId = cls.id;
      }
    }

    const id = "a_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    await db.assignment.create({
      data: {
        id,
        title: cleanMultiline(title, 160),
        body: cleanMultiline(text, 4000),
        audience,
        classId,
        deadline: new Date(deadline),
      },
    });
    return Response.json({ ok: true, id, classId: classId || "" });
  } catch {
    return jsonError("خطای سرور.", 500);
  }
}
