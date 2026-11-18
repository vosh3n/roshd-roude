import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, isSuperAdmin, jsonError } from "@/lib/auth";
import { cleanMultiline, cleanText, validDate } from "@/lib/sanitize";

const KINDS = ["meeting", "exam", "trip", "holiday", "event"];

/**
 * PATCH  /api/admin/events/{id} — ویرایش رویداد
 * DELETE /api/admin/events/{id} — حذف رویداد
 * دسترسی: فقط مدیر سایت
 */
async function guard() {
  const user = await currentUser();
  if (!user) return { error: jsonError("وارد حساب نشده‌ای.", 401) };
  if (!isSuperAdmin(user.role))
    return { error: jsonError("دسترسی مدیر سایت لازم است.", 403) };
  return { user };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g.error) return g.error;

  const { id } = await params;
  const row = await db.schoolEvent.findUnique({ where: { id } });
  if (!row) return jsonError("رویداد پیدا نشد.", 404);

  const body = await req.json().catch(() => ({}));
  const title = body.title !== undefined ? cleanText(body.title, 140) : row.title;
  const description =
    body.description !== undefined
      ? cleanMultiline(body.description, 1000)
      : row.description;
  const kind = KINDS.includes(String(body.kind)) ? String(body.kind) : row.kind;
  let startsAt = row.startsAt;
  if (body.startsAt !== undefined) {
    const d = validDate(body.startsAt);
    if (!d) return jsonError("تاریخ و ساعت رویداد معتبر نیست.", 400);
    startsAt = d;
  }
  if (title.length < 2) return jsonError("عنوان رویداد را بنویس.", 400);

  await db.schoolEvent.update({
    where: { id },
    data: { title, description, kind, startsAt },
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
  const row = await db.schoolEvent.findUnique({ where: { id } });
  if (!row) return jsonError("رویداد پیدا نشد.", 404);

  await db.schoolEvent.delete({ where: { id } });
  return Response.json({ ok: true });
}
