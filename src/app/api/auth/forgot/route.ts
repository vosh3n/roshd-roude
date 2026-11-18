/**
 * POST /api/auth/forgot — درخواست کد بازیابی رمز با ایمیل
 * بدنه: { email }
 * - همیشه پاسخ موفق عمومی برمی‌گرداند (جلوگیری از کشف وجود/نبودِ ایمیل)
 * - کد ۶ رقمی ۱۵ دقیقه‌ای هش‌شده در جدول PasswordReset ذخیره می‌شود
 * - اگر SMTP تنظیم شده باشد کد ایمیل می‌شود؛ وگرنه در حالت آزمایشی
 *   همان‌جا به پاسخ اضافه می‌شود (devCode) تا پروژه بدون سرویس ایمیل هم کار کند
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/auth";
import { hasSmtp, sendResetCodeEmail } from "@/lib/mailer";
import crypto from "crypto";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CODE_TTL_MS = 15 * 60 * 1000;

/* ---------- rate limit ساده در حافظه (per-IP: ۵ درخواست در ۱۰ دقیقه) ---------- */
const WINDOW_MS = 10 * 60_000;
const MAX_REQ = 5;
const buckets = new Map<string, { count: number; resetAt: number }>();

function allowRequest(key: string): boolean {
  const now = Date.now();
  if (buckets.size > 1000) {
    for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  b.count++;
  return b.count <= MAX_REQ;
}

function hashCode(username: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${username}:${code}`)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (!allowRequest(ip))
      return jsonError(
        "درخواست‌های زیادی فرستاده شده؛ کمی بعد دوباره تلاش کن.",
        429
      );

    const body = await req.json().catch(() => null);
    const email = String((body as any)?.email || "")
      .trim()
      .toLowerCase();
    if (!email || !EMAIL_RE.test(email))
      return jsonError("یک ایمیل معتبر وارد کن.");

    const user = await db.user.findFirst({ where: { email } });

    // پاسخ عمومی — لو ندادن اینکه ایمیل ثبت شده یا نه
    const generic = {
      ok: true,
      message: "اگر این ایمیل در حساب تو ثبت باشد، کد بازیابی ارسال می‌شود.",
    };

    if (!user) return Response.json(generic);

    const code = String(crypto.randomInt(100000, 999999));
    await db.passwordReset.upsert({
      where: { username: user.username },
      update: {
        codeHash: hashCode(user.username, code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
      create: {
        username: user.username,
        codeHash: hashCode(user.username, code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    let devCode: string | undefined;
    if (hasSmtp()) {
      try {
        await sendResetCodeEmail(email, code);
      } catch (e) {
        console.error(
          "[auth/forgot] ارسال ایمیل شکست خورد:",
          e instanceof Error ? e.message : e
        );
        // ارسال ایمیل شکست خورد — کد در حالت آزمایشی داده می‌شود
        devCode = code;
      }
    } else {
      // حالت آزمایشی — SMTP تنظیم نشده؛ کد به‌جای ایمیل برگردانده می‌شود
      devCode = code;
      console.log(`[auth/forgot] کد بازیابی ${user.username}: ${code}`);
    }

    return Response.json({
      ...generic,
      ...(devCode ? { devCode } : {}),
      ...(devCode
        ? {
            devNote:
              "سرویس ایمیل هنوز تنظیم نشده؛ کد بالا حالت آزمایشی است. برای ارسال واقعی ایمیل، SMTP را در فایل .env تنظیم کن.",
          }
        : {}),
    });
  } catch (e) {
    console.error(
      "[auth/forgot] error:",
      e instanceof Error ? e.message : e
    );
    return jsonError("خطای سرور در ارسال کد بازیابی.", 500);
  }
}
