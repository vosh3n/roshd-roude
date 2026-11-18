import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, isSuperAdmin, jsonError } from "@/lib/auth";
import { cleanMultiline, cleanText, validDate } from "@/lib/sanitize";

/**
 * GET  /api/admin/events — همهٔ رویدادها (شامل گذشته) برای مدیریت
 * POST /api/admin/events — ساخت رویداد { title, description, kind, startsAt }
 * دسترسی: فقط مدیر سایت
 */

const KINDS = ["meeting", "exam", "trip", "holiday", "event"];

export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (!isSuperAdmin(user.role)) return jsonError("دسترسی مدیر سایت لازم است.", 403);

  const items = await db.schoolEvent.findMany({
    orderBy: { startsAt: "asc" },
    take: 300,
  });
  return Response.json({
    items: items.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      kind: e.kind,
      startsAt: e.startsAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (!isSuperAdmin(user.role)) return jsonError("دسترسی مدیر سایت لازم است.", 403);

  const body = await req.json().catch(() => ({}));
  const title = cleanText(body.title, 140);
  const description = cleanMultiline(body.description, 1000);
  const kind = KINDS.includes(String(body.kind)) ? String(body.kind) : "event";
  const startsAt = validDate(body.startsAt);

  if (title.length < 2) return jsonError("عنوان رویداد را بنویس.", 400);
  if (!startsAt) return jsonError("تاریخ و ساعت رویداد معتبر نیست.", 400);

  const row = await db.schoolEvent.create({
    data: { title, description, kind, startsAt },
  });
  return Response.json({ ok: true, id: row.id });
}
