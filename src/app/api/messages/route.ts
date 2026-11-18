import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, isTeacher, jsonError, errDetail } from "@/lib/auth";
import { cleanMultiline, cleanText } from "@/lib/sanitize";

/**
 * GET  /api/messages — والد: پیام‌های خودش؛ معلم/مدیر سایت: همهٔ پیام‌ها
 * POST /api/messages — ارسال پیام جدید (فقط والد)
 *      محدودیت: حداکثر ۵ پیام در ساعت
 */

const MAX_PER_HOUR = 5;

export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);

  const where = isTeacher(user.role)
    ? {}
    : user.role === "parent"
      ? { parentUsername: user.username }
      : null;
  if (!where) return jsonError("این بخش مخصوص اولیا و معلم است.", 403);

  const items = await db.parentMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const parentNames = isTeacher(user.role)
    ? new Map(
        (
          await db.user.findMany({
            where: { role: "parent" },
            select: { username: true, name: true },
          })
        ).map((u) => [u.username, u.name])
      )
    : null;

  return Response.json({
    items: items.map((m) => ({
      id: m.id,
      subject: m.subject,
      body: m.body,
      reply: m.reply,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      repliedAt: m.repliedAt ? m.repliedAt.toISOString() : null,
      parentUsername: m.parentUsername,
      parentName: parentNames?.get(m.parentUsername) || m.parentUsername,
      studentUsername: m.studentUsername,
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
    if (user.role !== "parent")
      return jsonError("فقط والدین می‌توانند به معلم پیام بدهند.", 403);

    const body = await req.json().catch(() => ({}));
    const subject = cleanText(body.subject, 120);
    const text = cleanMultiline(body.body, 1500);
    const student = cleanText(body.studentUsername, 60);

    if (subject.length < 3) return jsonError("موضوع پیام را بنویس.", 400);
    if (text.length < 5) return jsonError("متن پیام خیلی کوتاه است.", 400);

    // اگر فرزند انتخاب‌شده مال همین والد نباشد، پذیرفته نشود
    let studentUsername = "";
    if (student) {
      const child = await db.user.findFirst({
        where: { username: student, parentUsername: user.username },
        select: { username: true },
      });
      studentUsername = child?.username || "";
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await db.parentMessage.count({
      where: { parentUsername: user.username, createdAt: { gte: hourAgo } },
    });
    if (recent >= MAX_PER_HOUR)
      return jsonError(
        "در یک ساعت گذشته چند پیام فرستاده‌ای؛ لطفاً کمی بعد دوباره تلاش کن.",
        429
      );

    const row = await db.parentMessage.create({
      data: {
        parentUsername: user.username,
        studentUsername,
        subject,
        body: text,
      },
    });
    return Response.json({ ok: true, id: row.id });
  } catch (e) {
    console.error("[messages] POST:", errDetail(e));
    return jsonError("ارسال پیام انجام نشد.", 500);
  }
}
