import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, isTeacher, jsonError } from "@/lib/auth";
import { cleanMultiline, cleanText } from "@/lib/sanitize";

/**
 * GET  /api/admin/announcements — همهٔ اطلاعیه‌ها برای مدیریت
 * POST /api/admin/announcements — ساخت اطلاعیه { title, body, important }
 * دسترسی: معلم یا مدیر سایت
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (!isTeacher(user.role)) return jsonError("دسترسی معلم لازم است.", 403);

  const items = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return Response.json({
    items: items.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      important: a.important,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (!isTeacher(user.role)) return jsonError("دسترسی معلم لازم است.", 403);

  const body = await req.json().catch(() => ({}));
  const title = cleanText(body.title, 140);
  const text = cleanMultiline(body.body, 3000);
  const important = body.important === true;

  if (title.length < 2) return jsonError("عنوان اطلاعیه را بنویس.", 400);
  if (text.length < 3) return jsonError("متن اطلاعیه خیلی کوتاه است.", 400);

  const row = await db.announcement.create({
    data: { title, body: text, important },
  });
  return Response.json({ ok: true, id: row.id });
}
