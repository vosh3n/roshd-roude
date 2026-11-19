import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, roleOf, jsonError } from "@/lib/auth";
import { cleanText, cleanMultiline } from "@/lib/sanitize";

/**
 * PATCH  /api/showcase/{id} — عنوان/توضیح/سنجاق/مخفی کردن (فقط صاحب کار)
 * DELETE /api/showcase/{id} — برداشتن کار از نمایشگاه (فقط صاحب کار)
 * سقف سنجاق: ۶ کار
 */

const MAX_PINNED = 6;

async function ownerGuard(id: string) {
  const user = await currentUser();
  if (!user) return { error: jsonError("وارد حساب نشده‌ای.", 401) };
  if ((await roleOf(user.username)) !== "student")
    return { error: jsonError("این بخش مخصوص دانش‌آموز است.", 403) };
  const row = await db.showcaseItem.findUnique({ where: { id } });
  if (!row) return { error: jsonError("این کار در نمایشگاه نیست.", 404) };
  if (row.username !== user.username)
    return { error: jsonError("این کار مال تو نیست.", 403) };
  return { user, row };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const g = await ownerGuard(id);
  if (g.error) return g.error;

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string") data.title = cleanText(body.title, 80);
  if (typeof body.description === "string")
    data.description = cleanMultiline(body.description, 300);
  if (typeof body.hidden === "boolean") data.hidden = body.hidden;

  if (typeof body.pinned === "boolean") {
    if (body.pinned) {
      const pinnedCount = await db.showcaseItem.count({
        where: { username: g.user.username, pinned: true, hidden: false },
      });
      const already = g.row.pinned;
      if (!already && pinnedCount >= MAX_PINNED)
        return jsonError(
          `حداکثر ${MAX_PINNED} کار را می‌توانی سنجاق کنی؛ اول یکی را بردار.`,
          400
        );
    }
    data.pinned = body.pinned;
  }

  if (!Object.keys(data).length) return jsonError("تغییری ارسال نشده.", 400);

  await db.showcaseItem.update({ where: { id }, data });
  return Response.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const g = await ownerGuard(id);
  if (g.error) return g.error;
  await db.showcaseItem.delete({ where: { id } });
  return Response.json({ ok: true });
}
