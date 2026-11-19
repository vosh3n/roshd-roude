import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, jsonError } from "@/lib/auth";
import { cleanText } from "@/lib/sanitize";

/**
 * POST /api/parent/reports/seen — نشان‌زدن گزارش‌ها به‌عنوان دیده‌شده
 * body: { child?: username } — خالی یعنی همهٔ فرزندان
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (user.role !== "parent")
    return jsonError("این بخش مخصوص اولیا است.", 403);

  const body = await req.json().catch(() => ({}));
  const requested = cleanText(body.child || "", 32);

  const children = await db.user.findMany({
    where: {
      role: "student",
      parentUsername: user.username,
      ...(requested ? { username: requested } : {}),
    },
    select: { username: true },
  });
  if (!children.length)
    return Response.json({ ok: true, updated: 0, unread: 0 });

  const res = await db.weeklyReport.updateMany({
    where: { username: { in: children.map((c) => c.username) }, seenAt: null },
    data: { seenAt: new Date() },
  });

  return Response.json({ ok: true, updated: res.count, unread: 0 });
}
