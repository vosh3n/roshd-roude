import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  currentUser,
  isSuperAdmin,
  jsonError,
  hashPass,
  errDetail,
} from "@/lib/auth";
import { cleanText } from "@/lib/sanitize";

/**
 * مدیریت دانش‌آموزان — فقط مدیر سایت
 *   GET    /api/admin/students            فهرست حساب‌ها و وضعیت
 *   PATCH  /api/admin/students            { username, password? , name? , parentUsername? }
 *   DELETE /api/admin/students?username=  حذف حساب دانش‌آموز
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

  const [students, parents, progress, missions, submissions] =
    await Promise.all([
      db.user.findMany({
        where: { role: "student" },
        select: {
          username: true,
          name: true,
          email: true,
          parentUsername: true,
          classId: true,
          clazz: { select: { name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: 1000,
      }),
      db.user.findMany({
        where: { role: "parent" },
        select: { username: true, name: true },
        orderBy: { username: "asc" },
      }),
      db.progress.findMany(),
      db.missionSubmission.groupBy({
        by: ["username", "status"],
        _count: { _all: true },
      }),
      db.submission.groupBy({ by: ["user"], _count: { _all: true } }),
    ]);

  const progressBy = new Map(progress.map((p) => [p.username, p]));
  const missionBy = new Map<string, { approved: number; pending: number }>();
  for (const m of missions) {
    const row = missionBy.get(m.username) || { approved: 0, pending: 0 };
    if (m.status === "approved") row.approved += m._count._all;
    else if (m.status === "pending") row.pending += m._count._all;
    missionBy.set(m.username, row);
  }
  const taskBy = new Map(submissions.map((s) => [s.user, s._count._all]));
  const parentName = new Map(parents.map((p) => [p.username, p.name]));

  return Response.json({
    parents,
    students: students.map((s) => {
      const p = progressBy.get(s.username);
      const m = missionBy.get(s.username) || { approved: 0, pending: 0 };
      return {
        username: s.username,
        name: s.name,
        email: s.email || "",
        field: p?.field || "",
        level: p?.level || "",
        parentUsername: s.parentUsername || "",
        parentName: parentName.get(s.parentUsername || "") || "",
        classId: s.classId || "",
        className: s.clazz?.name || "",
        approved: m.approved,
        pending: m.pending,
        tasks: taskBy.get(s.username) || 0,
        createdAt: s.createdAt.toISOString(),
      };
    }),
  });
}

export async function PATCH(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;

  const body = await req.json().catch(() => ({}));
  const username = cleanText(body.username, 60);
  if (!username) return jsonError("دانش‌آموز را انتخاب کن.", 400);

  const student = await db.user.findUnique({
    where: { username },
    select: { id: true, role: true },
  });
  if (!student || student.role !== "student")
    return jsonError("دانش‌آموز پیدا نشد.", 404);

  const data: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const name = cleanText(body.name, 80);
    if (name.length < 2) return jsonError("نام باید حداقل ۲ نویسه باشد.", 400);
    data.name = name;
  }

  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 6)
      return jsonError("رمز جدید باید حداقل ۶ نویسه باشد.", 400);
    if (body.password.length > 72)
      return jsonError("رمز جدید بیش از حد بلند است.", 400);
    const { salt, hash } = hashPass(body.password);
    data.salt = salt;
    data.hash = hash;
  }

  if (typeof body.classId === "string") {
    const classId = cleanText(body.classId, 40);
    if (classId) {
      const cls = await db.schoolClass.findUnique({
        where: { id: classId },
        select: { active: true },
      });
      if (!cls) return jsonError("کلاس پیدا نشد.", 404);
      if (!cls.active) return jsonError("این کلاس غیرفعال است.", 400);
    }
    data.classId = classId || null;
  }

  if (typeof body.parentUsername === "string") {
    const parentUsername = cleanText(body.parentUsername, 60);
    if (parentUsername) {
      const parent = await db.user.findUnique({
        where: { username: parentUsername },
        select: { role: true },
      });
      if (!parent || parent.role !== "parent")
        return jsonError("والد پیدا نشد.", 404);
    }
    data.parentUsername = parentUsername;
  }

  if (!Object.keys(data).length) return jsonError("تغییری ارسال نشده.", 400);

  try {
    await db.user.update({ where: { username }, data });
    // تغییر رمز → نشست‌های قبلی باطل شوند
    if (data.hash) await db.session.deleteMany({ where: { userId: student.id } });
    return Response.json({ ok: true });
  } catch (e) {
    return jsonError(`ذخیره نشد — ${errDetail(e)}`, 500);
  }
}

export async function DELETE(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;

  const username = cleanText(
    new URL(req.url).searchParams.get("username") || "",
    60
  );
  if (!username) return jsonError("دانش‌آموز را انتخاب کن.", 400);

  const student = await db.user.findUnique({
    where: { username },
    select: { id: true, role: true },
  });
  if (!student || student.role !== "student")
    return jsonError("دانش‌آموز پیدا نشد.", 404);

  await db.$transaction([
    db.session.deleteMany({ where: { userId: student.id } }),
    db.progress.deleteMany({ where: { username } }),
    db.missionSubmission.deleteMany({ where: { username } }),
    db.submission.deleteMany({ where: { user: username } }),
    db.announcementRead.deleteMany({ where: { username } }),
    db.parentMessage.deleteMany({ where: { studentUsername: username } }),
    db.user.delete({ where: { username } }),
  ]);

  return Response.json({ ok: true });
}
