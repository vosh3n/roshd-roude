import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPass, createSession, jsonError, errDetail } from "@/lib/auth";
import { ensureAdmin } from "@/lib/bootstrap";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  try {
    await ensureAdmin();
    const body = await req.json();
    const name = String(body.name || "").trim();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const email = String(body.email || "").trim().toLowerCase();

    if (!name || !username || !password)
      return jsonError("همه فیلدها را پر کن.");
    if (password.length < 4)
      return jsonError("رمز عبور باید حداقل ۴ کاراکتر باشد.");
    if (!/^[\w.\-]{3,32}$/.test(username))
      return jsonError("نام کاربری فقط حروف، عدد و _ باشد.");
    if (email && !EMAIL_RE.test(email))
      return jsonError("ایمیل معتبر نیست.");

    const exists = await db.user.findUnique({ where: { username } });
    if (exists) return jsonError("این نام کاربری قبلاً گرفته شده.", 409);
    if (email) {
      const emailTaken = await db.user.findFirst({ where: { email } });
      if (emailTaken)
        return jsonError("این ایمیل قبلاً برای حساب دیگری ثبت شده.", 409);
    }

    const { salt, hash } = hashPass(password);
    await db.user.create({
      data: { username, name, email: email || null, salt, hash },
    });

    const sid = await createSession(username);
    if (!sid) return jsonError("خطای ساخت نشست.", 500);

    const allow = await db.adminAllow.findUnique({ where: { username } });
    const res = Response.json({
      user: {
        username,
        name,
        email: email || "",
        role: allow ? "admin" : "student",
        avatar: "",
      },
    });
    res.headers.append(
      "Set-Cookie",
      `sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`
    );
    return res;
  } catch (e) {
    console.error("[auth/register] 500:", e);
    return jsonError(`خطای سرور — ${errDetail(e)}`, 500);
  }
}
