import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, jsonError } from "@/lib/auth";
import { missionDto, isMissionStatus } from "@/lib/missions-server";

/**
 * GET /api/admin/missions?status=pending|revision|approved
 * دسترسی: معلم (admin). ارسال‌های ماموریت همهٔ دانش‌آموزان با نام.
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (user.role !== "admin") return jsonError("دسترسی معلم نداری.", 403);

  const statusParam = req.nextUrl.searchParams.get("status");
  const where = isMissionStatus(statusParam) ? { status: statusParam } : {};

  const rows = await db.missionSubmission.findMany({
    where,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 300,
  });

  const usernames = Array.from(new Set(rows.map((r) => r.username)));
  const users = await db.user.findMany({
    where: { username: { in: usernames } },
    select: { username: true, name: true },
  });
  const names = new Map(users.map((u) => [u.username, u.name]));

  const counts = {
    total: rows.length,
    pending: 0,
    revision: 0,
    approved: 0,
  };
  const all = await db.missionSubmission.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  for (const g of all) {
    if (g.status === "pending") counts.pending = g._count._all;
    if (g.status === "revision") counts.revision = g._count._all;
    if (g.status === "approved") counts.approved = g._count._all;
  }
  counts.total = counts.pending + counts.revision + counts.approved;

  return Response.json({
    submissions: rows.map((r) => ({
      ...missionDto(r),
      student: r.username,
      studentName: names.get(r.username) || r.username,
    })),
    counts,
  });
}
