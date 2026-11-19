/**
 * گزارش هفتگی اولیا — محاسبه از دادهٔ واقعی (شنبه تا جمعه)، بدون cron.
 * گزارش‌ها در جدول WeeklyReport ذخیره می‌شوند تا تاریخچه و نشان «گزارش جدید»
 * پایدار بمانند؛ هفتهٔ جاری با هر بازدید دوباره محاسبه می‌شود.
 */

import { db } from "@/lib/db";
import { dayKey, JMONTHS, toFa, toJalali } from "@/lib/jalali";
import { CERT_THRESHOLD } from "@/lib/missions-data";

export interface WeekStats {
  weekStart: string;
  weekEnd: string;
  label: string;
  isCurrent: boolean;
  missions: { approved: number; pending: number; revision: number; target: number };
  activeDays: number;
  streak: number;
  tasks: { submitted: number; approved: number; revision: number; late: number };
  revisionCount: number;
  badges: string[];
  newBadges: string[];
  certificate: { done: number; threshold: number; percent: number };
  summary: string;
  compare: "up" | "down" | "same" | null;
  compareText: string;
}

/** شنبهٔ همان هفته (ساعت صفر) */
export function weekStartOf(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const sinceSaturday = (d.getDay() + 1) % 7; // شنبه = 0
  d.setDate(d.getDate() - sinceSaturday);
  return d;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function jalaliLabel(start: Date, end: Date) {
  const a = toJalali(start);
  const b = toJalali(end);
  if (a.jm === b.jm && a.jy === b.jy)
    return `${toFa(a.jd)} تا ${toFa(b.jd)} ${JMONTHS[b.jm - 1]} ${toFa(b.jy)}`;
  return `${toFa(a.jd)} ${JMONTHS[a.jm - 1]} تا ${toFa(b.jd)} ${JMONTHS[b.jm - 1]} ${toFa(b.jy)}`;
}

/** نشان‌های تازه بر اساس عبور از آستانه‌ها در همان هفته */
function newBadgesOf(
  approvedBefore: number,
  approvedAfter: number,
  streakPrime: number
): string[] {
  const out: string[] = [];
  const crossed = (threshold: number) =>
    approvedBefore < threshold && approvedAfter >= threshold;
  if (crossed(1)) out.push("start");
  if (crossed(25)) out.push("c25");
  if (crossed(50)) out.push("c50");
  if (streakPrime >= 3 && streakPrime < 7) out.push("streak3");
  if (streakPrime >= 7) out.push("streak7");
  return out;
}

function buildSummary(
  isCurrent: boolean,
  approved: number,
  target: number,
  activeDays: number,
  tasks: WeekStats["tasks"],
  revisionCount: number,
  streak: number
): string {
  const when = isCurrent ? "این هفته تا الان" : "این هفته";
  if (approved === 0 && tasks.submitted === 0)
    return `${when} هنوز کاری ثبت نشده؛ یک ماموریت کوتاه شروع خوبی است. با هم قدم اول را برمی‌داریم.`;
  const parts: string[] = [];
  if (approved > 0)
    parts.push(
      `${when} ${toFa(approved)} ماموریت تاییدشده از ${toFa(target)} انجام داد${approved >= 8 ? " — آفرین!" : "."}`
    );
  if (tasks.submitted > 0)
    parts.push(
      `${toFa(tasks.submitted)} تکلیف تحویل داد${tasks.approved > 0 ? ` و ${toFa(tasks.approved)} تایش تایید شد` : ""}.`
    );
  if (revisionCount > 0)
    parts.push(
      `${toFa(revisionCount)} کار نیاز به اصلاح دارد؛ با یک بازبینی کوتاه دوباره عالی می‌شود.`
    );
  if (activeDays >= 5) parts.push("فعال بودن در بیشتر روزهای هفته نشانهٔ پشتکار است.");
  if (streak >= 3) parts.push(`${toFa(streak)} روز متوالی ادامه داده — عالی!`);
  if (approved >= target * 0.8) parts.push("نزدیک شدن به همهٔ ماموریت‌های هفته، تلاش قشنگی است.");
  return parts.join(" ");
}

/** محاسبهٔ یک هفته برای یک دانش‌آموز */
export async function computeWeek(
  username: string,
  weekStart: Date,
  isCurrent: boolean
): Promise<WeekStats> {
  const startKey = dayKey(weekStart);
  const end = addDays(weekStart, 6);
  const endKey = dayKey(end);
  const startAt = new Date(weekStart);
  const endAt = new Date(addDays(weekStart, 7));

  const [missions, progress, submissions, approvedAllBefore] = await Promise.all([
    db.missionSubmission.findMany({
      where: { username, day: { gte: startKey, lte: endKey } },
      select: { status: true, day: true },
    }),
    db.progress.findUnique({ where: { username } }),
    db.submission.findMany({
      where: { user: username, at: { gte: startAt, lt: endAt } },
      include: { assignment: { select: { deadline: true } } },
    }),
    db.missionSubmission.count({
      where: { username, status: "approved", day: { lt: startKey } },
    }),
  ]);

  const approvedMissions = missions.filter((m) => m.status === "approved");
  const pending = missions.filter((m) => m.status === "pending").length;
  const revisionMissions = missions.filter((m) => m.status === "revision").length;

  /* روزهای فعال: روزی که ماموریت تاییدشده یا تکلیف داشته */
  const activeSet = new Set<string>();
  for (const m of approvedMissions) activeSet.add(m.day);
  for (const s of submissions) activeSet.add(dayKey(new Date(s.at)));

  /* روزهای متوالی: تا امروز (یا تا پایان هفتهٔ گذشته) */
  const limit = isCurrent ? new Date() : end;
  const approvedDays = new Set(
    (
      await db.missionSubmission.findMany({
        where: { username, status: "approved", day: { lte: dayKey(limit) } },
        select: { day: true },
      })
    ).map((m) => m.day)
  );
  let streak = 0;
  for (let i = 0; i < 120; i++) {
    if (approvedDays.has(dayKey(addDays(limit, -i)))) streak++;
    else if (i === 0) continue; // امروز ممکن است هنوز کاری ثبت نشده باشد
    else break;
  }

  const tasksSubmitted = submissions.length;
  const tasksApproved = submissions.filter((s) => s.status === "approved").length;
  const tasksRevision = submissions.filter((s) => s.status === "revision").length;
  const tasksLate = submissions.filter(
    (s) => s.assignment && new Date(s.at) > new Date(s.assignment.deadline)
  ).length;

  const approvedTotal =
    approvedAllBefore + approvedMissions.length;
  const newBadges = newBadgesOf(
    approvedAllBefore,
    approvedTotal,
    streak
  );

  let badges: string[] = [];
  try {
    const parsed = JSON.parse(progress?.badgesJson || "[]");
    if (Array.isArray(parsed)) badges = parsed.filter((b) => typeof b === "string");
  } catch {}

  const certificateDone = approvedTotal;
  const certificatePercent = Math.min(
    100,
    Math.round((certificateDone / CERT_THRESHOLD) * 100)
  );

  const target = 28;

  return {
    weekStart: startKey,
    weekEnd: endKey,
    label: jalaliLabel(weekStart, end),
    isCurrent,
    missions: {
      approved: approvedMissions.length,
      pending,
      revision: revisionMissions,
      target,
    },
    activeDays: activeSet.size,
    streak,
    tasks: {
      submitted: tasksSubmitted,
      approved: tasksApproved,
      revision: tasksRevision,
      late: tasksLate,
    },
    revisionCount: revisionMissions + tasksRevision,
    badges,
    newBadges,
    certificate: {
      done: certificateDone,
      threshold: CERT_THRESHOLD,
      percent: certificatePercent,
    },
    summary: buildSummary(
      isCurrent,
      approvedMissions.length,
      target,
      activeSet.size,
      {
        submitted: tasksSubmitted,
        approved: tasksApproved,
        revision: tasksRevision,
        late: tasksLate,
      },
      revisionMissions + tasksRevision,
      streak
    ),
    compare: null,
    compareText: "",
  };
}

/** همهٔ گزارش‌های ۸ هفتهٔ اخیر + ذخیره در دیتابیس */
export async function reportsFor(username: string): Promise<WeekStats[]> {
  const current = weekStartOf();
  const weeks: WeekStats[] = [];

  for (let i = 0; i < 8; i++) {
    const start = addDays(current, -7 * i);
    const isCurrent = i === 0;
    const stats = await computeWeek(username, start, isCurrent);
    weeks.push(stats);

    const existing = await db.weeklyReport.findUnique({
      where: { username_weekStart: { username, weekStart: stats.weekStart } },
      select: { id: true, seenAt: true },
    });

    if (existing) {
      await db.weeklyReport.update({
        where: { id: existing.id },
        data: { dataJson: JSON.stringify(stats), summary: stats.summary },
      });
    } else {
      await db.weeklyReport.create({
        data: {
          username,
          weekStart: stats.weekStart,
          dataJson: JSON.stringify(stats),
          summary: stats.summary,
          // هفته‌های گذشته از ابتدا «دیده‌شده»اند؛ فقط هفتهٔ جاری تازه است
          seenAt: isCurrent ? null : new Date(),
        },
      });
    }
  }

  /* مقایسهٔ ساده با هفتهٔ قبل */
  for (let i = 0; i < weeks.length; i++) {
    const prev = weeks[i + 1];
    if (!prev) continue;
    const a = weeks[i].missions.approved;
    const b = prev.missions.approved;
    weeks[i].compare = a > b ? "up" : a < b ? "down" : "same";
    weeks[i].compareText =
      a > b
        ? `بیشتر از هفتهٔ قبل (${toFa(a - b)} ماموریت بیشتر)`
        : a < b
          ? `کمتر از هفتهٔ قبل (${toFa(b - a)} ماموریت کمتر)`
          : "مثل هفتهٔ قبل";
  }

  return weeks;
}

/** تعداد گزارش‌های دیده‌نشدهٔ یک دانش‌آموز */
export async function unreadReportsFor(username: string): Promise<number> {
  return db.weeklyReport.count({ where: { username, seenAt: null } });
}
