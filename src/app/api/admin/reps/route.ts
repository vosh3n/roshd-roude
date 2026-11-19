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
 * مدیریت حساب نماینده‌های آموزشی — فقط مدیر سایت
 *   GET    /api/admin/reps              فهرست نماینده‌ها
 *   POST   /api/admin/reps              ساخت نماینده { name, username, password, classRoom }
 *   PATCH  /api/admin/reps              { username, name?, classRoom?, active?, password? }
 *   DELETE /api/admin/reps?username=    حذف حساب
 *
 * تنها راه ساخت این نقش همین مسیر و اسکریپت seed است؛ ثبت‌نام عمومی همیشه
 * فقط دانش‌آموز می‌سازد و معلم/نماینده هیچ راهی برای ساخت نقش ندارند.
 */

const USERNAME_RE = /^[\w.\-]{3,32}$/;

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

  const rows = await db.user.findMany({
    where: { role: "educational_rep" },
    select: {
      username: true,
      name: true,
      email: true,
      classRoom: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  return Response.json({
    reps: rows.map((r) => ({
      username: r.username,
      name: r.name,
      email: r.email || "",
      classRoom: r.classRoom || "",
      active: r.active !== false,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;

  const body = await req.json().catch(() => ({}));
  const name = cleanText(body.name, 80);
  const username = cleanText(body.username, 32);
  const password = String(body.password || "");
  const classRoom = cleanText(body.classRoom, 60);

  if (name.length < 2) return jsonError("نام نماینده را بنویس.", 400);
  if (!USERNAME_RE.test(username))
    return jsonError(
      "نام کاربری باید ۳ تا ۳۲ نویسه و فقط حروف انگلیسی، عدد، نقطه، خط تیره یا _ باشد.",
      400
    );
  if (password.length < 5)
    return jsonError("رمز موقت باید حداقل ۵ نویسه باشد.", 400);
  if (password.length > 72) return jsonError("رمز بیش از حد بلند است.", 400);

  const exists = await db.user.findUnique({ where: { username } });
  if (exists) return jsonError("این نام کاربری قبلاً گرفته شده.", 409);

  try {
    const { salt, hash } = hashPass(password);
    await db.user.create({
      data: {
        username,
        name,
        email: null,
        salt,
        hash,
        role: "educational_rep",
        classRoom,
        active: true,
      },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return jsonError(`ساخت حساب انجام نشد — ${errDetail(e)}`, 500);
  }
}

export async function PATCH(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;

  const body = await req.json().catch(() => ({}));
  const username = cleanText(body.username, 32);
  if (!username) return jsonError("نماینده را انتخاب کن.", 400);

  const rep = await db.user.findUnique({
    where: { username },
    select: { id: true, role: true },
  });
  if (!rep || rep.role !== "educational_rep")
    return jsonError("نمایندهٔ آموزشی پیدا نشد.", 404);

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = cleanText(body.name, 80);
    if (name.length < 2) return jsonError("نام خیلی کوتاه است.", 400);
    data.name = name;
  }
  if (typeof body.classRoom === "string")
    data.classRoom = cleanText(body.classRoom, 60);
  if (typeof body.active === "boolean") data.active = body.active;
  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 5)
      return jsonError("رمز جدید باید حداقل ۵ نویسه باشد.", 400);
    if (body.password.length > 72)
      return jsonError("رمز جدید بیش از حد بلند است.", 400);
    const { salt, hash } = hashPass(body.password);
    data.salt = salt;
    data.hash = hash;
  }

  if (!Object.keys(data).length) return jsonError("تغییری ارسال نشده.", 400);

  await db.user.update({ where: { username }, data });
  // تغییر رمز یا غیرفعال‌کردن → نشست‌های قبلی باطل شوند
  if (data.hash || data.active === false)
    await db.session.deleteMany({ where: { userId: rep.id } });

  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;

  const username = cleanText(
    new URL(req.url).searchParams.get("username") || "",
    32
  );
  if (!username) return jsonError("نماینده را انتخاب کن.", 400);

  const rep = await db.user.findUnique({
    where: { username },
    select: { id: true, role: true },
  });
  if (!rep || rep.role !== "educational_rep")
    return jsonError("نمایندهٔ آموزشی پیدا نشد.", 404);

  await db.$transaction([
    db.session.deleteMany({ where: { userId: rep.id } }),
    db.user.delete({ where: { username } }),
  ]);

  return Response.json({ ok: true });
}
