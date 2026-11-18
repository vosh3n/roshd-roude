import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { checkPass, createSession, roleOf, jsonError, errDetail, avatarUrl } from "@/lib/auth";
import { ensureAdmin, normalizeLoginId } from "@/lib/bootstrap";

export async function POST(req: NextRequest) {
  try {
    // تضمین وجود حساب مدیر اصلی (حتی اگر دیتابیس تازه ری‌ست شده باشد)
    await ensureAdmin();
    const body = await req.json();
    // ورود با نام کاربری یا ایمیل — هر دو پشتیبانی می‌شود
    const identifier = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!identifier || !password)
      return jsonError("نام کاربری/ایمیل و رمز عبور را وارد کن.", 400);

    /* ---------- یافتن حساب: اول نام کاربری، بعد ایمیل ---------- */
    let u = await db.user.findUnique({ where: { username: identifier } });
    if (!u) {
      // ورود راحت: «amir mohamad» یا «Amir-Mohamad» هم همان حساب را پیدا کند
      const wanted = normalizeLoginId(identifier);
      const all = await db.user.findMany({ select: { username: true, name: true } });
      const match = all.find(
        (x) =>
          normalizeLoginId(x.username) === wanted ||
          normalizeLoginId(x.name) === wanted
      );
      if (match) u = await db.user.findUnique({ where: { username: match.username } });
    }
    if (!u && identifier.includes("@")) {
      const byEmail = await db.user.findMany({
        where: { email: identifier.toLowerCase() },
      });
      if (byEmail.length > 1)
        return jsonError(
          "با این ایمیل چند حساب ثبت شده است؛ لطفاً با نام کاربری وارد شو.",
          409
        );
      u = byEmail[0] ?? null;
    }

    if (!u || !checkPass(password, u.salt, u.hash))
      return jsonError("نام کاربری/ایمیل یا رمز عبور اشتباه است.", 401);

    const sid = await createSession(u.username);
    if (!sid) return jsonError("خطای ساخت نشست.", 500);

    const role = await roleOf(u.username);
    const res = Response.json({
      user: {
        username: u.username,
        name: u.name,
        email: u.email || "",
        role,
        avatar: avatarUrl(u.username, u.avatar),
      },
    });
    res.headers.append(
      "Set-Cookie",
      `sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`
    );
    return res;
  } catch (e) {
    console.error("[auth/login] 500:", e);
    return jsonError(`خطای سرور — ${errDetail(e)}`, 500);
  }
}
