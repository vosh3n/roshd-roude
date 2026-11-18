/**
 * POST /api/auth/email — ثبت/تغییر ایمیل بازیابی حساب فعلی
 * بدنه: { email }
 * - برای کاربران قدیمی که هنگام ثبت‌نام ایمیل نداده‌اند
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, jsonError, errDetail } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return jsonError("ابتدا وارد حساب کاربری شو.", 401);

    const body = await req.json().catch(() => null);
    const email = String((body as any)?.email || "").trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email))
      return jsonError("یک ایمیل معتبر وارد کن.");

    const taken = await db.user.findFirst({
      where: { email, NOT: { username: user.username } },
    });
    if (taken)
      return jsonError("این ایمیل قبلاً برای حساب دیگری ثبت شده.", 409);

    await db.user.update({
      where: { username: user.username },
      data: { email },
    });

    return Response.json({ ok: true, email });
  } catch (e) {
    console.error("[auth/email] error:", errDetail(e));
    return jsonError("خطای سرور در ذخیرهٔ ایمیل.", 500);
  }
}
