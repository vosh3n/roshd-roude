/**
 * POST /api/auth/reset — تغییر رمز با کد بازیابی
 * بدنه: { email, code, password }
 * - کد را با hash مقایسه می‌کند و ۱۵ دقیقه اعتبار دارد
 * - بعد از موفقیت: کد باطل، همهٔ نشست‌های فعال کاربر خارج می‌شوند
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonError, hashPass, errDetail } from "@/lib/auth";
import crypto from "crypto";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function hashCode(username: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${username}:${code}`)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = String((body as any)?.email || "").trim().toLowerCase();
    const code = String((body as any)?.code || "").replace(/\D/g, "");
    const password = String((body as any)?.password || "");

    if (!email || !EMAIL_RE.test(email))
      return jsonError("یک ایمیل معتبر وارد کن.");
    if (code.length !== 6) return jsonError("کد بازیابی ۶ رقم است.");
    if (password.length < 4)
      return jsonError("رمز عبور باید حداقل ۴ کاراکتر باشد.");

    const user = await db.user.findFirst({ where: { email } });
    const reset = user
      ? await db.passwordReset.findUnique({ where: { username: user.username } })
      : null;

    if (!user || !reset)
      return jsonError("کد بازیابی معتبر نیست؛ دوباره درخواست بده.", 400);
    if (reset.expiresAt.getTime() < Date.now()) {
      await db.passwordReset.delete({ where: { username: user.username } });
      return jsonError("کد بازیابی منقضی شده؛ دوباره درخواست بده.", 400);
    }
    if (reset.codeHash !== hashCode(user.username, code))
      return jsonError("کد بازیابی اشتباه است.", 400);

    const { salt, hash } = hashPass(password);
    await db.user.update({ where: { username: user.username }, data: { salt, hash } });
    await db.passwordReset.delete({ where: { username: user.username } });
    // نشست‌های قدیمی باطل شوند
    await db.session.deleteMany({ where: { userId: user.id } });

    return Response.json({
      ok: true,
      message: "رمز عبور عوض شد؛ حالا با رمز جدید وارد شو.",
    });
  } catch (e) {
    console.error("[auth/reset] error:", errDetail(e));
    return jsonError("خطای سرور در تغییر رمز.", 500);
  }
}
