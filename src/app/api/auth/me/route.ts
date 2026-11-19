import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { ensureAdmin } from "@/lib/bootstrap";
import { unreadReportsFor } from "@/lib/weekly-report";

export async function GET() {
  // هر بار باز شدن سایت، حساب مدیر اصلی تضمین می‌شود
  await ensureAdmin();
  const user = await currentUser();
  if (!user) return Response.json({ user: null });

  /* نام کلاس و تعداد گزارش‌های دیده‌نشده (برای نشان منوی اولیا) */
  let className = "";
  if (user.classId) {
    const cls = await db.schoolClass.findUnique({
      where: { id: user.classId },
      select: { name: true },
    });
    className = cls?.name || "";
  }

  let reportUnread = 0;
  if (user.role === "parent") {
    const children = await db.user.findMany({
      where: { role: "student", parentUsername: user.username },
      select: { username: true },
      take: 50,
    });
    for (const c of children) reportUnread += await unreadReportsFor(c.username);
  }

  return Response.json({
    user: { ...user, className, reportUnread },
  });
}
