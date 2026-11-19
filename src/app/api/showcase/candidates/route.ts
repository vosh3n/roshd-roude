import { db } from "@/lib/db";
import { currentUser, roleOf, jsonError } from "@/lib/auth";

/**
 * GET /api/showcase/candidates — همهٔ کارهای تاییدشدهٔ دانش‌آموز برای انتخاب
 * فقط برای خود دانش‌آموز؛ شامل این‌که هر کار الان در نمایشگاه هست یا نه.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if ((await roleOf(user.username)) !== "student")
    return jsonError("این بخش مخصوص دانش‌آموز است.", 403);

  const [missions, submissions, items] = await Promise.all([
    db.missionSubmission.findMany({
      where: { username: user.username, status: "approved" },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    db.submission.findMany({
      where: { user: user.username, status: "approved" },
      include: { assignment: { select: { title: true } } },
      orderBy: { at: "desc" },
      take: 200,
    }),
    db.showcaseItem.findMany({ where: { username: user.username } }),
  ]);

  const byKey = new Map(items.map((i) => [i.sourceType + ":" + i.sourceId, i]));

  const list = [
    ...missions.map((m) => {
      const existing = byKey.get("mission:" + m.id);
      return {
        sourceType: "mission" as const,
        sourceId: m.id,
        title: existing?.title || m.title || "ماموریت تاییدشده",
        description: existing?.description || m.text || "",
        field: m.field || "",
        level: m.level || "",
        kindLabel: "ماموریت روزانه",
        at: (m.reviewedAt || m.updatedAt).toISOString(),
        inShowcase: !!existing && !existing.hidden,
        hidden: !!existing?.hidden,
        pinned: !!existing?.pinned,
        hasFile: !!m.fileId,
        fileName: m.fileName || "",
        fileType: m.fileType || "",
      };
    }),
    ...submissions.map((s) => {
      const existing = byKey.get("task:" + s.id);
      return {
        sourceType: "task" as const,
        sourceId: s.id,
        title: existing?.title || s.assignment?.title || "تکلیف تاییدشده",
        description: existing?.description || s.note || "",
        field: "",
        level: "",
        kindLabel: s.assignment?.title || "تکلیف",
        at: (s.reviewedAt || s.at).toISOString(),
        inShowcase: !!existing && !existing.hidden,
        hidden: !!existing?.hidden,
        pinned: !!existing?.pinned,
        hasFile: true,
        fileName: s.fileName || "",
        fileType: "",
      };
    }),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return Response.json({ candidates: list });
}
