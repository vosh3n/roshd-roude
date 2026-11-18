import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dayKey } from "@/lib/jalali";
import {
  currentUser,
  jsonError,
  avatarUrl,
  isTeacher,
} from "@/lib/auth";

function safeParse<T>(raw: string, fallback: T): T {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * GET /api/parent/overview[?child=username] — نمای کلی فرزندان
 * - والد: فقط دانش‌آموزانی که parentUsername آن‌ها نام والد است
 * - معلم / مدیر سایت: همهٔ دانش‌آموزان
 * خروجی: { students: [...] }
 */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (user.role !== "parent" && !isTeacher(user.role))
    return jsonError("این بخش فقط برای اولیا و معلم است.", 403);

  const child = (req.nextUrl.searchParams.get("child") || "").trim();

  const where =
    user.role === "parent"
      ? { role: "student", parentUsername: user.username }
      : { role: "student" };

  const students = await db.user.findMany({
    where: child ? { ...where, username: child } : where,
    orderBy: { username: "asc" },
    include: { progress: true },
    take: 300,
  });

  const usernames = students.map((s) => s.username);

  const submissions = await db.submission.findMany({
    where: { user: { in: usernames } },
    orderBy: { at: "desc" },
    include: { assignment: { select: { title: true } } },
  });
  const subsByUser = new Map<string, typeof submissions>();
  for (const s of submissions) {
    const list = subsByUser.get(s.user) || [];
    list.push(s);
    subsByUser.set(s.user, list);
  }

  /* وضعیت ماموریت‌ها — فقط برای مشاهده در پنل اولیا */
  const missions = await db.missionSubmission.findMany({
    where: { username: { in: usernames } },
    orderBy: { updatedAt: "desc" },
  });
  const missionsByUser = new Map<string, typeof missions>();
  for (const m of missions) {
    const list = missionsByUser.get(m.username) || [];
    list.push(m);
    missionsByUser.set(m.username, list);
  }

  const out = students.map((st) => {
    const p = st.progress;
    const subs = (subsByUser.get(st.username) || []).map((s) => ({
      id: s.id,
      assignmentTitle: s.assignment?.title || "تکلیف",
      fileName: s.fileName,
      extraName: s.extraName || "",
      note: s.note || "",
      at: s.at.toISOString(),
    }));
    const myMissions = missionsByUser.get(st.username) || [];
    const missionStats = { pending: 0, approved: 0, revision: 0 };
    for (const m of myMissions) {
      if (m.status === "pending") missionStats.pending++;
      else if (m.status === "approved") missionStats.approved++;
      else if (m.status === "revision") missionStats.revision++;
    }
    const missionRecent = myMissions.slice(0, 8).map((m) => ({
      title: m.title,
      status: m.status,
      teacherNote: m.teacherNote,
      day: m.day,
      at: m.updatedAt.toISOString(),
    }));
    const today = dayKey();
    const missionToday = myMissions
      .filter((m) => m.day === today)
      .map((m) => ({
        title: m.title,
        status: m.status,
        teacherNote: m.teacherNote,
        day: m.day,
        at: m.updatedAt.toISOString(),
      }));

    return {
      username: st.username,
      name: st.name,
      avatar: avatarUrl(st.username, st.avatar),
      field: p?.field || "",
      level: p?.level || "",
      completed: p ? safeParse<Record<string, boolean>>(p.completedJson, {}) : {},
      badges: p ? safeParse<string[]>(p.badgesJson, []) : [],
      updatedAt: p ? p.updatedAt.toISOString() : null,
      submissions: subs,
      missionStats,
      missionRecent,
      missionToday,
    };
  });

  return Response.json({ students: out });
}
