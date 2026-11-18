import { db } from "@/lib/db";
import { currentUser, roleOf, jsonError } from "@/lib/auth";

export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if ((await roleOf(user.username)) !== "admin")
    return jsonError("دسترسی مدیر نداری.", 403);

  const users = await db.user.findMany();
  const nameOf = new Map(users.map((u) => [u.username, u.name]));
  const assignments = await db.assignment.findMany({
    orderBy: { createdAt: "asc" },
    include: { submissions: { orderBy: { at: "asc" } } },
  });

  return Response.json({
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      deadline: a.deadline.toISOString(),
      expired: Date.now() > a.deadline.getTime(),
      submissions: a.submissions.map((s) => ({
        id: s.id,
        user: s.user,
        name: nameOf.get(s.user) || s.user,
        fileName: s.fileName,
        extraName: s.extraName,
        note: s.note,
        at: s.at.toISOString(),
      })),
    })),
  });
}
