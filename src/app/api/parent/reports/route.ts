import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, jsonError } from "@/lib/auth";
import { cleanText } from "@/lib/sanitize";
import { reportsFor, unreadReportsFor } from "@/lib/weekly-report";

/**
 * GET /api/parent/reports[?child=username] — گزارش هفتگی ۸ هفتهٔ اخیر
 * فقط والد؛ هر والد فقط فرزندان وصل‌شده به خودش را می‌بیند.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (user.role !== "parent")
    return jsonError("این بخش مخصوص اولیا است.", 403);

  const children = await db.user.findMany({
    where: { role: "student", parentUsername: user.username },
    select: { username: true, name: true },
    orderBy: { username: "asc" },
    take: 50,
  });

  const requested = cleanText(req.nextUrl.searchParams.get("child") || "", 32);
  const child = requested
    ? children.find((c) => c.username === requested)
    : children[0];

  let unread = 0;
  for (const c of children) unread += await unreadReportsFor(c.username);

  if (!child)
    return Response.json({ children, reports: [], unread, child: null });

  const reports = await reportsFor(child.username);
  return Response.json({
    children,
    child: { username: child.username, name: child.name },
    unread,
    reports,
  });
}
