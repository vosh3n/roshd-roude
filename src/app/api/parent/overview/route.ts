import { db } from "@/lib/db";
import { currentUser, jsonError, avatarUrl } from "@/lib/auth";

function safeParse<T>(raw: string, fallback: T): T {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * GET /api/parent/overview — نمای کلی پنل مشاهدهٔ اولیا
 * دسترسی: والد یا ادمین
 * خروجی: { students: [{ username, name, avatar?, field, level, completed, badges, updatedAt, submissions }] }
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (user.role !== "parent" && user.role !== "admin")
    return jsonError("این بخش فقط برای اولیا و ادمین است.", 403);

  const students = await db.user.findMany({
    where: { role: "student" },
    orderBy: { username: "asc" },
    include: { progress: true },
  });

  const submissions = await db.submission.findMany({
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
    const missionRecent = myMissions.slice(0, 5).map((m) => ({
      title: m.title,
      status: m.status,
      teacherNote: m.teacherNote,
      at: m.updatedAt.toISOString(),
    }));

    return {
      username: st.username,
      name: st.name,
      // آدرس عکس پروفایل؛ اگر عکسی نباشد رشتهٔ خالی برمی‌گردد
      avatar: avatarUrl(st.username, st.avatar),
      field: p?.field || "",
      level: p?.level || "",
      completed: p ? safeParse<Record<string, boolean>>(p.completedJson, {}) : {},
      badges: p ? safeParse<string[]>(p.badgesJson, []) : [],
      updatedAt: p ? p.updatedAt.toISOString() : null,
      submissions: subs,
      missionStats,
      missionRecent,
    };
  });

  return Response.json({ students: out });
}
