import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, jsonError, errDetail } from "@/lib/auth";
import { cleanText } from "@/lib/sanitize";
import { reportsFor } from "@/lib/weekly-report";
import { smtpConfigured } from "@/lib/mailer";

/**
 * POST /api/parent/reports/email — ارسال گزارش هفتگی به ایمیل والد
 * اگر SMTP در .env تنظیم نشده باشد، این مسیر ۴۰۰ می‌دهد و رابط کاربری هم
 * گزینه را نشان نمی‌دهد.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (user.role !== "parent")
    return jsonError("این بخش مخصوص اولیا است.", 403);
  if (!smtpConfigured())
    return jsonError("ارسال ایمیل در این نسخه فعال نیست.", 400);

  const body = await req.json().catch(() => ({}));
  const childName = cleanText(body.child || "", 32);
  const weekStart = cleanText(body.weekStart || "", 20);

  const child = await db.user.findFirst({
    where: { username: childName, role: "student", parentUsername: user.username },
    select: { username: true, name: true },
  });
  if (!child) return jsonError("این دانش‌آموز فرزند تو نیست.", 403);

  const to = (await db.user.findUnique({
    where: { username: user.username },
    select: { email: true },
  }))?.email;
  if (!to) return jsonError("اول ایمیل حسابت را در تنظیمات ثبت کن.", 400);

  const reports = await reportsFor(child.username);
  const report = weekStart
    ? reports.find((r) => r.weekStart === weekStart)
    : reports[0];
  if (!report) return jsonError("گزارشی برای این هفته پیدا نشد.", 404);

  try {
    const { sendMail } = await import("@/lib/mailer");
    await sendMail({
      to,
      subject: `گزارش هفتگی ${child.name} — ${report.label}`,
      text: [
        report.summary,
        "",
        `ماموریت‌های تاییدشده: ${report.missions.approved} از ${report.missions.target}`,
        `روزهای فعال: ${report.activeDays}`,
        `تکالیف تحویل‌شده: ${report.tasks.submitted} (تاییدشده: ${report.tasks.approved})`,
        `کارهای نیازمند اصلاح: ${report.revisionCount}`,
        `پیشرفت گواهی: ${report.certificate.percent}٪`,
      ].join("\n"),
    });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[reports/email] 500:", errDetail(e));
    return jsonError("ارسال ایمیل انجام نشد.", 500);
  }
}
