import { db } from "@/lib/db";
import { currentUser, avatarUrl, jsonError } from "@/lib/auth";

/** امتیازها — ساده و قابل توضیح برای دانش‌آموز */
const MISSION_POINTS = 10;
const SUBMISSION_POINTS = 30;

type Row = {
  username: string;
  name: string;
  avatar: string;
  field: string;
  level: string;
  missions: number;
  submissions: number;
  score: number;
  rank: number;
};

/**
 * GET /api/ranking — جدول رتبه‌بندی دانش‌آموزان
 * امتیاز = (تعداد ماموریت‌های انجام‌شده × ۱۰) + (تعداد تکالیف ارسالی × ۳۰)
 * ورودی: هر کاربر واردشده به‌جز والدین
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (user.role === "parent")
    return jsonError("این بخش برای دانش‌آموزها و مدیر است.", 403);

  const students = await db.user.findMany({
    where: { role: "student" },
    select: { username: true, name: true, avatar: true },
  });

  const progress = await db.progress.findMany();
  const progressBy = new Map(progress.map((p) => [p.username, p]));

  const grouped = await db.submission.groupBy({
    by: ["user"],
    _count: { _all: true },
  });
  const subCount = new Map(grouped.map((g) => [g.user, g._count._all]));

  const rows: Row[] = students.map((s) => {
    const p = progressBy.get(s.username);
    let missions = 0;
    if (p?.completedJson) {
      try {
        const done = JSON.parse(p.completedJson) as Record<string, boolean>;
        missions = Object.values(done).filter(Boolean).length;
      } catch {
        missions = 0;
      }
    }
    const submissions = subCount.get(s.username) || 0;
    return {
      username: s.username,
      name: s.name,
      avatar: avatarUrl(s.username, s.avatar),
      field: p?.field || "",
      level: p?.level || "",
      missions,
      submissions,
      score: missions * MISSION_POINTS + submissions * SUBMISSION_POINTS,
      rank: 0,
    };
  });

  rows.sort(
    (a, b) =>
      b.score - a.score ||
      b.missions - a.missions ||
      a.name.localeCompare(b.name, "fa")
  );

  // رتبهٔ پیوسته: هر دانش‌آموز یک جای مشخص دارد تا هدفش روشن باشد
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });

  return Response.json({
    points: { mission: MISSION_POINTS, submission: SUBMISSION_POINTS },
    total: rows.length,
    me: user.username,
    rows,
  });
}
