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
  isEducationalRep,
  UPLOAD_DIR,
} from "@/lib/auth";
import { classOfRep } from "@/lib/classes";
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
  return { user, role };
}

/** نماینده فقط به تکالیف کلاس خودش دست می‌زند */
async function repGuard(role: string, username: string, classId: string | null) {
  if (!isEducationalRep(role)) return null;
  const myClass = await classOfRep(username);
  if (!myClass || classId !== myClass)
    return jsonError("این تکلیف مربوط به کلاس تو نیست.", 403);
  return null;
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

  const denied = await repGuard(g.role, g.user.username, existing.classId);
  if (denied) return denied;

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
  /* تغییر کلاس فقط برای معلم و مدیر سایت؛ نماینده اجازهٔ جابه‌جایی ندارد */
  if (typeof body.classId === "string" && !isEducationalRep(g.role)) {
    const classId = cleanText(body.classId, 40);
    if (classId) {
      const cls = await db.schoolClass.findUnique({
        where: { id: classId },
        select: { active: true },
      });
      if (!cls) return jsonError("کلاس پیدا نشد.", 404);
      if (!cls.active) return jsonError("این کلاس غیرفعال است.", 400);
    }
    data.classId = classId || null;
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

  const denied = await repGuard(g.role, g.user.username, existing.classId);
  if (denied) return denied;

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
