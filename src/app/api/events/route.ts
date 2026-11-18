import { db } from "@/lib/db";
import { currentUser, jsonError } from "@/lib/auth";

/**
 * GET /api/events — رویدادهای پیش‌روی تقویم مدرسه، نزدیک‌ترین اول
 * دسترسی: هر کاربر وارد‌شده
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const items = await db.schoolEvent.findMany({
    where: { startsAt: { gte: startOfToday } },
    orderBy: [{ startsAt: "asc" }],
    take: 100,
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
