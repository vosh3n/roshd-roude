import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, roleOf, jsonError } from "@/lib/auth";

export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);

  const assignments = await db.assignment.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      submissions: {
        where: { user: user.username },
        orderBy: { at: "asc" },
        take: 1,
      },
    },
  });

  return Response.json({
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      deadline: a.deadline.toISOString(),
      expired: Date.now() > a.deadline.getTime(),
      mine: a.submissions[0]
        ? {
            fileName: a.submissions[0].fileName,
            note: a.submissions[0].note,
            at: a.submissions[0].at.toISOString(),
          }
        : null,
    })),
    role: await roleOf(user.username),
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if ((await roleOf(user.username)) !== "admin")
    return jsonError("دسترسی مدیر نداری.", 403);

  try {
    const body = await req.json();
    const title = String(body.title || "").trim();
    const text = String(body.body || "").trim();
    const deadline = String(body.deadline || "");
    if (!title || !text || !deadline || Number.isNaN(new Date(deadline).getTime()))
      return jsonError("عنوان، توضیحات و مهلت معتبر لازم است.");

    const id = "a_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    await db.assignment.create({
      data: {
        id,
        title: title.slice(0, 160),
        body: text.slice(0, 4000),
        deadline: new Date(deadline),
      },
    });
    return Response.json({ ok: true });
  } catch {
    return jsonError("خطای سرور.", 500);
  }
}
