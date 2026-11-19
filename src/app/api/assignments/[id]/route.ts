import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import {
  currentUser,
  roleOf,
  jsonError,
  errDetail,
  canManageAssignments,
  UPLOAD_DIR,
} from "@/lib/auth";
import { cleanMultiline, cleanText } from "@/lib/sanitize";

/**
 * PATCH  /api/assignments/{id} — ویرایش تکلیف (عنوان، توضیح، مهلت، کلاس/رشته)
 * DELETE /api/assignments/{id} — حذف تکلیف همراه فایل‌های ارسال‌شده
 * دسترسی: معلم، مدیر سایت و نمایندهٔ آموزشی
 */

async function guard() {
  const user = await currentUser();
  if (!user) return { error: jsonError("وارد حساب نشده‌ای.", 401) };
  const role = await roleOf(user.username);
  if (!canManageAssignments(role))
    return { error: jsonError("دسترسی مدیریت تکالیف نداری.", 403) };
  return { user };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g.error) return g.error;

  const { id } = await params;
  const existing = await db.assignment.findUnique({ where: { id } });
  if (!existing) return jsonError("تکلیف پیدا نشد.", 404);

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string") {
    const title = cleanMultiline(body.title, 160);
    if (title.length < 2) return jsonError("عنوان تکلیف خیلی کوتاه است.", 400);
    data.title = title;
  }
  if (typeof body.body === "string") {
    const text = cleanMultiline(body.body, 4000);
    if (text.length < 2) return jsonError("توضیح تکلیف خیلی کوتاه است.", 400);
    data.body = text;
  }
  if (typeof body.audience === "string") {
    data.audience = cleanText(body.audience, 80);
  }
  if (typeof body.deadline === "string" && body.deadline) {
    const d = new Date(body.deadline);
    if (Number.isNaN(d.getTime())) return jsonError("مهلت معتبر نیست.", 400);
    data.deadline = d;
  }

  if (!Object.keys(data).length) return jsonError("تغییری ارسال نشده.", 400);

  try {
    await db.assignment.update({ where: { id }, data });
    return Response.json({ ok: true });
  } catch (e) {
    return jsonError(`ویرایش انجام نشد — ${errDetail(e)}`, 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g.error) return g.error;

  const { id } = await params;
  const existing = await db.assignment.findUnique({
    where: { id },
    include: { submissions: true },
  });
  if (!existing) return jsonError("تکلیف پیدا نشد.", 404);

  try {
    // فایل‌های ارسال‌شده روی دیسک هم پاک شوند (فقط داخل پوشهٔ آپلود)
    for (const s of existing.submissions) {
      for (const fileId of [s.fileId, s.extraId]) {
        if (!fileId) continue;
        const p = path.join(UPLOAD_DIR, fileId);
        if (p.startsWith(UPLOAD_DIR) && fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
          } catch {
            /* فایل نبود — اشکالی ندارد */
          }
        }
      }
    }
    await db.assignment.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (e) {
    return jsonError(`حذف انجام نشد — ${errDetail(e)}`, 500);
  }
}
