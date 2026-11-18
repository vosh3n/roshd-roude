import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, isSuperAdmin, jsonError } from "@/lib/auth";
import { cleanText } from "@/lib/sanitize";

/**
 * GET  /api/admin/families — فهرست والدین و دانش‌آموزان با اتصال فعلی
 * POST /api/admin/families — اتصال دانش‌آموز به والد { studentUsername, parentUsername }
 *      parentUsername خالی = قطع اتصال
 * دسترسی: فقط مدیر سایت
 */

async function guard() {
  const user = await currentUser();
  if (!user) return { error: jsonError("وارد حساب نشده‌ای.", 401) };
  if (!isSuperAdmin(user.role))
    return { error: jsonError("دسترسی مدیر سایت لازم است.", 403) };
  return { user };
}

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;

  const [parents, students] = await Promise.all([
    db.user.findMany({
      where: { role: "parent" },
      select: { username: true, name: true },
      orderBy: { username: "asc" },
    }),
    db.user.findMany({
      where: { role: "student" },
      select: { username: true, name: true, parentUsername: true },
      orderBy: { username: "asc" },
      take: 500,
    }),
  ]);

  return Response.json({ parents, students });
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;

  const body = await req.json().catch(() => ({}));
  const studentUsername = cleanText(body.studentUsername, 60);
  const parentUsername = cleanText(body.parentUsername, 60);

  if (!studentUsername) return jsonError("دانش‌آموز را انتخاب کن.", 400);

  const student = await db.user.findUnique({
    where: { username: studentUsername },
    select: { role: true },
  });
  if (!student || student.role !== "student")
    return jsonError("دانش‌آموز پیدا نشد.", 404);

  if (parentUsername) {
    const parent = await db.user.findUnique({
      where: { username: parentUsername },
      select: { role: true },
    });
    if (!parent || parent.role !== "parent")
      return jsonError("والد پیدا نشد.", 404);
  }

  await db.user.update({
    where: { username: studentUsername },
    data: { parentUsername },
  });
  return Response.json({ ok: true });
}
