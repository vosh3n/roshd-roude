import { db } from "@/lib/db";
import { currentUser, jsonError } from "@/lib/auth";

/**
 * GET /api/announcements — اطلاعیه‌های مدرسه، جدیدها اول
 * خروجی: { items: [{ id, title, body, important, createdAt, read }], unread }
 * دسترسی: هر کاربر وارد‌شده
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (user.role === "educational_rep")
    return jsonError("نمایندهٔ آموزشی به اطلاعیه‌ها دسترسی ندارد.", 403);

  const items = await db.announcement.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });
  const reads = await db.announcementRead.findMany({
    where: { username: user.username },
    select: { announcementId: true },
  });
  const readSet = new Set(reads.map((r) => r.announcementId));

  const out = items.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    important: a.important,
    createdAt: a.createdAt.toISOString(),
    read: readSet.has(a.id),
  }));

  return Response.json({
    items: out,
    unread: out.filter((a) => !a.read).length,
  });
}
