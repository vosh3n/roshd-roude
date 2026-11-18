import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, isTeacher, jsonError } from "@/lib/auth";
import { cleanMultiline, cleanText } from "@/lib/sanitize";

/**
 * PATCH  /api/admin/announcements/{id} — ویرایش { title?, body?, important? }
 * DELETE /api/admin/announcements/{id} — حذف
 * دسترسی: معلم یا مدیر سایت
 */
async function guard() {
  const user = await currentUser();
  if (!user) return { error: jsonError("وارد حساب نشده‌ای.", 401) };
  if (!isTeacher(user.role)) return { error: jsonError("دسترسی معلم لازم است.", 403) };
  return { user };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g.error) return g.error;

  const { id } = await params;
  const row = await db.announcement.findUnique({ where: { id } });
  if (!row) return jsonError("اطلاعیه پیدا نشد.", 404);

  const body = await req.json().catch(() => ({}));
  const title = body.title !== undefined ? cleanText(body.title, 140) : row.title;
  const text =
    body.body !== undefined ? cleanMultiline(body.body, 3000) : row.body;
  const important =
    body.important !== undefined ? body.important === true : row.important;

  if (title.length < 2) return jsonError("عنوان اطلاعیه را بنویس.", 400);
  if (text.length < 3) return jsonError("متن اطلاعیه خیلی کوتاه است.", 400);

  await db.announcement.update({
    where: { id },
    data: { title, body: text, important },
  });
  return Response.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g.error) return g.error;

  const { id } = await params;
  const row = await db.announcement.findUnique({ where: { id } });
  if (!row) return jsonError("اطلاعیه پیدا نشد.", 404);

  await db.announcementRead.deleteMany({ where: { announcementId: id } });
  await db.announcement.delete({ where: { id } });
  return Response.json({ ok: true });
}
