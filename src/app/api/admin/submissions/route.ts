import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  currentUser,
  roleOf,
  jsonError,
  canManageAssignments,
  isEducationalRep,
} from "@/lib/auth";
import { classOfRep } from "@/lib/classes";

/**
 * GET /api/admin/submissions — ارسال‌های تکالیف برای بررسی
 * دسترسی: معلم، مدیر سایت (همهٔ کلاس‌ها، فیلتر ?classId) و نماینده (فقط کلاس خودش)
 * خروجی: تکالیف با ارسال‌ها + دانش‌آموزان همان دامنه + فهرست کلاس‌ها
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  const role = await roleOf(user.username);
  if (!canManageAssignments(role))
    return jsonError("دسترسی بررسی تکالیف نداری.", 403);

  const rep = isEducationalRep(role);
  const repClassId = rep ? await classOfRep(user.username) : null;
  if (rep && !repClassId)
    return Response.json({
      students: [],
      assignments: [],
      classes: [],
      scope: "بدون کلاس",
    });

  const filterClass = rep ? repClassId : req.nextUrl.searchParams.get("classId") || "";

  const [users, assignments, classes] = await Promise.all([
    db.user.findMany({
      where: {
        role: "student",
        ...(filterClass ? { classId: filterClass } : {}),
      },
      select: { username: true, name: true, classId: true },
      orderBy: { username: "asc" },
      take: 1000,
    }),
    db.assignment.findMany({
      where: filterClass ? { classId: filterClass } : {},
      orderBy: { createdAt: "asc" },
      include: {
        class: { select: { id: true, name: true } },
        submissions: { orderBy: { at: "asc" } },
      },
      take: 500,
    }),
    rep
      ? Promise.resolve([])
      : db.schoolClass.findMany({
          select: { id: true, name: true, active: true },
          orderBy: { name: "asc" },
        }),
  ]);

  const nameOf = new Map(users.map((u) => [u.username, u.name]));

  return Response.json({
    classes,
    students: users.map((u) => ({
      username: u.username,
      name: u.name,
      classId: u.classId || "",
    })),
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience || "",
      classId: a.classId || "",
      className: a.class?.name || "",
      deadline: a.deadline.toISOString(),
      createdAt: a.createdAt.toISOString(),
      expired: Date.now() > a.deadline.getTime(),
      submissions: a.submissions.map((s) => ({
        id: s.id,
        user: s.user,
        name: nameOf.get(s.user) || s.user,
        fileName: s.fileName,
        extraName: s.extraName,
        note: s.note,
        status: s.status || "pending",
        feedback: s.feedback || "",
        grade: s.grade || "",
        at: s.at.toISOString(),
        reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
      })),
    })),
  });
}
