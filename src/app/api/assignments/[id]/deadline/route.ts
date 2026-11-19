import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, roleOf, jsonError, canManageAssignments } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (!canManageAssignments(await roleOf(user.username)))
    return jsonError("دسترسی مدیر نداری.", 403);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const deadline = String(body.deadline || "");
  if (Number.isNaN(new Date(deadline).getTime()))
    return jsonError("مهلت معتبر نیست.");

  const a = await db.assignment.findUnique({ where: { id } });
  if (!a) return jsonError("تکلیف پیدا نشد.", 404);

  await db.assignment.update({
    where: { id },
    data: { deadline: new Date(deadline) },
  });
  return Response.json({ ok: true });
}
