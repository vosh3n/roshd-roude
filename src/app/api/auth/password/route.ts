import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  currentUser,
  checkPass,
  hashPass,
  jsonError,
  errDetail,
} from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * POST /api/auth/password — تغییر رمز کاربر جاری { current, next }
 * رمز جدید با همان scrypt پروژه هش می‌شود؛ نشست‌های دیگر باطل می‌شوند.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return jsonError("وارد حساب نشده‌ای.", 401);

    const body = await req.json().catch(() => ({}));
    const current = String(body.current || "");
    const next = String(body.next || "");

    if (!current) return jsonError("رمز فعلی را وارد کن.", 400);
    if (next.length < 6)
      return jsonError("رمز جدید باید حداقل ۶ نویسه باشد.", 400);
    if (next.length > 72) return jsonError("رمز جدید بیش از حد بلند است.", 400);
    if (next === current)
      return jsonError("رمز جدید باید با رمز فعلی فرق کند.", 400);

    const row = await db.user.findUnique({
      where: { username: user.username },
      select: { id: true, salt: true, hash: true },
    });
    if (!row) return jsonError("حساب پیدا نشد.", 404);
    if (!checkPass(current, row.salt, row.hash))
      return jsonError("رمز فعلی درست نیست.", 403);

    const { salt, hash } = hashPass(next);
    await db.user.update({
      where: { username: user.username },
      data: { salt, hash },
    });

    // نشست‌های دیگر باطل شوند؛ نشست جاری می‌ماند
    const store = await cookies();
    const sid = store.get("sid")?.value || "";
    await db.session.deleteMany({
      where: { userId: row.id, id: { not: sid } },
    });

    return Response.json({ ok: true });
  } catch (e) {
    console.error("[auth/password] 500:", errDetail(e));
    return jsonError("تغییر رمز انجام نشد.", 500);
  }
}
