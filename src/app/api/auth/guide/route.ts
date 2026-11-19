import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, jsonError } from "@/lib/auth";

/**
 * POST /api/auth/guide — وضعیت دیده‌شدن راهنمای سه‌مرحله‌ای دانش‌آموز
 * body: { seen?: boolean } — پیش‌فرض true؛ seen:false برای «دیدن دوباره».
 * وضعیت روی خود کاربر در دیتابیس ذخیره می‌شود (نه localStorage).
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (user.role !== "student")
    return jsonError("این راهنما مخصوص دانش‌آموزان است.", 403);

  const body = await req.json().catch(() => ({}));
  const seen = body.seen !== false;

  await db.user.update({
    where: { username: user.username },
    data: { guideSeen: seen },
  });
  return Response.json({ ok: true, seen });
}
