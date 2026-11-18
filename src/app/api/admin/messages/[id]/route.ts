import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, isTeacher, jsonError } from "@/lib/auth";
import { cleanMultiline } from "@/lib/sanitize";

/**
 * POST /api/admin/messages/{id} — پاسخ معلم به پیام والد { reply }
 * دسترسی: معلم یا مدیر سایت
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (!isTeacher(user.role)) return jsonError("دسترسی معلم لازم است.", 403);

  const { id } = await params;
  const row = await db.parentMessage.findUnique({ where: { id } });
  if (!row) return jsonError("پیام پیدا نشد.", 404);

  const body = await req.json().catch(() => ({}));
  const reply = cleanMultiline(body.reply, 1500);
  if (reply.length < 3) return jsonError("متن پاسخ را بنویس.", 400);

  await db.parentMessage.update({
    where: { id },
    data: { reply, status: "answered", repliedAt: new Date() },
  });
  return Response.json({ ok: true });
}
