import { db } from "@/lib/db";
import { currentUser, roleOf, jsonError, canManageAssignments } from "@/lib/auth";

/**
 * GET /api/admin/submissions — ارسال‌های تکالیف برای بررسی
 * دسترسی: معلم، مدیر سایت و نمایندهٔ آموزشی
 * خروجی: تکالیف با همهٔ ارسال‌ها (وضعیت، بازخورد، نمره) + فهرست دانش‌آموزان
 *        (برای فیلتر «ارسال‌نشده» و فیلتر بر اساس دانش‌آموز)
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (!canManageAssignments(await roleOf(user.username)))
    return jsonError("دسترسی بررسی تکالیف نداری.", 403);

  const [users, assignments] = await Promise.all([
    db.user.findMany({
      where: { role: "student" },
      select: { username: true, name: true },
      orderBy: { username: "asc" },
      take: 1000,
    }),
    db.assignment.findMany({
      orderBy: { createdAt: "asc" },
      include: { submissions: { orderBy: { at: "asc" } } },
    }),
  ]);

  const nameOf = new Map(users.map((u) => [u.username, u.name]));

  return Response.json({
    students: users.map((u) => ({ username: u.username, name: u.name })),
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience || "",
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
