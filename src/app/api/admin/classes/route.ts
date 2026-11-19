import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, isSuperAdmin, jsonError, errDetail } from "@/lib/auth";
import { cleanText } from "@/lib/sanitize";

/**
 * مدیریت کلاس‌ها — فقط مدیر سایت
 *   GET   /api/admin/classes  فهرست کلاس‌ها + نماینده‌ها + تعداد دانش‌آموز
 *   POST  /api/admin/classes  { name, year?, active? }
 *   PATCH /api/admin/classes  { id, name?, year?, active?, repUsername? }
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

  const [classes, reps] = await Promise.all([
    db.schoolClass.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { _count: { select: { students: true, assignments: true } } },
      take: 300,
    }),
    db.user.findMany({
      where: { role: "educational_rep" },
      select: { username: true, name: true, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const repName = new Map(reps.map((r) => [r.username, r.name]));

  return Response.json({
    reps,
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      year: c.year,
      active: c.active,
      repUsername: c.repUsername,
      repName: repName.get(c.repUsername) || "",
      studentCount: c._count.students,
      assignmentCount: c._count.assignments,
    })),
  });
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;

  const body = await req.json().catch(() => ({}));
  const name = cleanText(body.name, 60);
  const year = cleanText(body.year, 20);
  if (name.length < 2) return jsonError("نام کلاس را بنویس.", 400);

  const exists = await db.schoolClass.findUnique({ where: { name } });
  if (exists) return jsonError("کلاسی با این نام از قبل هست.", 409);

  try {
    const row = await db.schoolClass.create({
      data: { name, year, active: body.active !== false },
    });
    return Response.json({ ok: true, id: row.id });
  } catch (e) {
    return jsonError(`ساخت کلاس انجام نشد — ${errDetail(e)}`, 500);
  }
}

export async function PATCH(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;

  const body = await req.json().catch(() => ({}));
  const id = cleanText(body.id, 40);
  if (!id) return jsonError("کلاس را انتخاب کن.", 400);

  const cls = await db.schoolClass.findUnique({ where: { id } });
  if (!cls) return jsonError("کلاس پیدا نشد.", 404);

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = cleanText(body.name, 60);
    if (name.length < 2) return jsonError("نام کلاس را بنویس.", 400);
    if (name !== cls.name) {
      const dup = await db.schoolClass.findUnique({ where: { name } });
      if (dup) return jsonError("کلاسی با این نام از قبل هست.", 409);
    }
    data.name = name;
  }
  if (typeof body.year === "string") data.year = cleanText(body.year, 20);
  if (typeof body.active === "boolean") data.active = body.active;

  let newRep = "";
  let repChanged = false;
  if (typeof body.repUsername === "string") {
    newRep = cleanText(body.repUsername, 32);
    repChanged = true;
    if (newRep) {
      const rep = await db.user.findUnique({
        where: { username: newRep },
        select: { role: true, active: true },
      });
      if (!rep || rep.role !== "educational_rep")
        return jsonError("نمایندهٔ آموزشی پیدا نشد.", 404);
      if (rep.active === false)
        return jsonError("این نماینده غیرفعال است؛ اول فعالش کن.", 400);
    }
    data.repUsername = newRep;
  }

  if (!Object.keys(data).length) return jsonError("تغییری ارسال نشده.", 400);

  await db.$transaction(async (tx) => {
    await tx.schoolClass.update({ where: { id }, data });
    if (repChanged) {
      // هر نماینده فقط مسئول یک کلاس است
      if (newRep)
        await tx.schoolClass.updateMany({
          where: { repUsername: newRep, id: { not: id } },
          data: { repUsername: "" },
        });
      if (newRep)
        await tx.user.update({
          where: { username: newRep },
          data: { classId: id },
        });
      if (cls.repUsername && cls.repUsername !== newRep)
        await tx.user.updateMany({
          where: { username: cls.repUsername, classId: id },
          data: { classId: null },
        });
    }
  });

  return Response.json({ ok: true });
}
