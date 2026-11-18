import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, jsonError } from "@/lib/auth";
import { cleanText } from "@/lib/sanitize";

/**
 * POST /api/announcements/read — علامت‌زدن اطلاعیه‌ها به‌عنوان خوانده‌شده
 * body: { ids?: string[], all?: boolean }
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);

  const body = await req.json().catch(() => ({}));
  let ids: string[] = Array.isArray(body.ids)
    ? body.ids.map((x: unknown) => cleanText(x, 60)).filter(Boolean).slice(0, 100)
    : [];
  if (body.all === true) {
    const all = await db.announcement.findMany({ select: { id: true }, take: 200 });
    ids = all.map((a) => a.id);
  }
  if (!ids.length) return Response.json({ ok: true, updated: 0 });

  const existing = await db.announcement.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });

  let updated = 0;
  for (const a of existing) {
    await db.announcementRead.upsert({
      where: {
        username_announcementId: {
          username: user.username,
          announcementId: a.id,
        },
      },
      create: { username: user.username, announcementId: a.id },
      update: {},
    });
    updated++;
  }

  return Response.json({ ok: true, updated });
}
