import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  currentUser,
  roleOf,
  jsonError,
  isTeacher,
  isEducationalRep,
} from "@/lib/auth";
import { cleanText, cleanMultiline } from "@/lib/sanitize";

/**
 * نمایشگاه «کارهای من»
 * GET  /api/showcase?student=username — کارهای نمایشگاه یک دانش‌آموز
 * POST /api/showcase { sourceType, sourceId, title?, description? }
 *
 * حریم خصوصی (سمت سرور):
 *  - دانش‌آموز فقط نمایشگاه خودش را می‌بیند/ویرایش می‌کند
 *  - والد فقط فرزند وصل‌شده به خودش
 *  - معلم/مدیر سایت هر دانش‌آموزی
 *  - نمایندهٔ آموزشی هیچ دسترسی‌ای ندارد
 * فقط کارهای «تایید شده» نمایش داده می‌شوند؛ منبع حذف/رد شده خودکار حذف می‌شود.
 */

export interface ShowcaseWork {
  id: string;
  sourceType: "mission" | "task";
  sourceId: string;
  title: string;
  description: string;
  field: string;
  kindLabel: string;
  at: string;
  pinned: boolean;
  preview: "image" | "video" | "file" | "text";
  fileUrl: string;
  fileName: string;
}

function previewOf(fileName: string, fileType?: string) {
  const t = fileType || "";
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (/^image\//.test(t) || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext))
    return "image" as const;
  if (/^video\//.test(t) || ["mp4", "webm", "mov"].includes(ext))
    return "video" as const;
  return "file" as const;
}

/** بررسی دسترسی به نمایشگاه یک دانش‌آموز */
async function resolveTarget(
  role: string,
  username: string,
  requested: string
): Promise<{ target?: string; error?: Response }> {
  if (isEducationalRep(role))
    return { error: jsonError("نمایندهٔ آموزشی به نمایشگاه دسترسی ندارد.", 403) };

  if (role === "student") {
    if (requested && requested !== username)
      return { error: jsonError("فقط نمایشگاه خودت را می‌بینی.", 403) };
    return { target: username };
  }

  if (role === "parent") {
    const child = requested
      ? await db.user.findFirst({
          where: { username: requested, parentUsername: username },
          select: { username: true },
        })
      : await db.user.findFirst({
          where: { role: "student", parentUsername: username },
          select: { username: true },
        });
    if (!child) return { error: jsonError("این دانش‌آموز فرزند تو نیست.", 403) };
    return { target: child.username };
  }

  if (!isTeacher(role))
    return { error: jsonError("دسترسی نداری.", 403) };

  if (!requested) return { error: jsonError("دانش‌آموز را انتخاب کن.", 400) };
  const st = await db.user.findFirst({
    where: { username: requested, role: "student" },
    select: { username: true },
  });
  if (!st) return { error: jsonError("دانش‌آموز پیدا نشد.", 404) };
  return { target: st.username };
}

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  const role = await roleOf(user.username);

  const requested = cleanText(req.nextUrl.searchParams.get("student") || "", 32);
  const r = await resolveTarget(role, user.username, requested);
  if (r.error) return r.error;
  const target = r.target as string;

  const [student, items, progress] = await Promise.all([
    db.user.findUnique({
      where: { username: target },
      select: { username: true, name: true },
    }),
    db.showcaseItem.findMany({
      where: { username: target, hidden: false },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    db.progress.findUnique({ where: { username: target } }),
  ]);

  const missionIds = items.filter((i) => i.sourceType === "mission").map((i) => i.sourceId);
  const taskIds = items.filter((i) => i.sourceType === "task").map((i) => i.sourceId);

  const [missions, submissions] = await Promise.all([
    missionIds.length
      ? db.missionSubmission.findMany({
          where: { id: { in: missionIds }, username: target, status: "approved" },
        })
      : Promise.resolve([]),
    taskIds.length
      ? db.submission.findMany({
          where: { id: { in: taskIds }, user: target, status: "approved" },
          include: { assignment: { select: { title: true } } },
        })
      : Promise.resolve([]),
  ]);

  const missionBy = new Map<string, (typeof missions)[number]>(
    missions.map((m) => [m.id, m] as const)
  );
  const taskBy = new Map<string, (typeof submissions)[number]>(
    submissions.map((s) => [s.id, s] as const)
  );

  const works: ShowcaseWork[] = [];
  const stale: string[] = [];

  for (const it of items) {
    if (it.sourceType === "mission") {
      const m = missionBy.get(it.sourceId);
      if (!m) {
        stale.push(it.id);
        continue;
      }
      works.push({
        id: it.id,
        sourceType: "mission",
        sourceId: m.id,
        title: it.title || m.title || "ماموریت تاییدشده",
        description: it.description || m.text || "",
        field: m.field || "",
        kindLabel: "ماموریت روزانه",
        at: (m.reviewedAt || m.updatedAt).toISOString(),
        pinned: it.pinned,
        preview: m.fileId ? previewOf(m.fileName, m.fileType) : "text",
        fileUrl: m.fileId
          ? `/api/missions/${encodeURIComponent(m.id)}/file?inline=1`
          : "",
        fileName: m.fileName || "",
      });
    } else {
      const s = taskBy.get(it.sourceId);
      if (!s) {
        stale.push(it.id);
        continue;
      }
      works.push({
        id: it.id,
        sourceType: "task",
        sourceId: s.id,
        title: it.title || s.assignment?.title || "تکلیف تاییدشده",
        description: it.description || s.note || "",
        field: "",
        kindLabel: s.assignment?.title || "تکلیف",
        at: (s.reviewedAt || s.at).toISOString(),
        pinned: it.pinned,
        preview: previewOf(s.fileName),
        fileUrl: `/api/submissions/${encodeURIComponent(s.id)}/file?inline=1`,
        fileName: s.fileName || "",
      });
    }
  }

  /* کارهایی که دیگر تاییدشده نیستند از نمایشگاه پاک می‌شوند */
  if (stale.length)
    await db.showcaseItem.deleteMany({ where: { id: { in: stale } } });

  const field = progress?.field || "";

  return Response.json({
    student: {
      username: target,
      name: student?.name || target,
      field,
    },
    canEdit: role === "student" && target === user.username,
    total: works.length,
    works,
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if ((await roleOf(user.username)) !== "student")
    return jsonError("فقط دانش‌آموز می‌تواند کار به نمایشگاه اضافه کند.", 403);

  const body = await req.json().catch(() => ({}));
  const sourceType = String(body.sourceType || "");
  const sourceId = cleanText(body.sourceId, 60);
  const title = cleanText(body.title, 80);
  const description = cleanMultiline(body.description, 300);

  if (sourceType !== "mission" && sourceType !== "task")
    return jsonError("نوع کار نامعتبر است.", 400);
  if (!sourceId) return jsonError("کار را انتخاب کن.", 400);

  /* فقط کار تاییدشده و متعلق به همین دانش‌آموز */
  if (sourceType === "mission") {
    const m = await db.missionSubmission.findFirst({
      where: { id: sourceId, username: user.username, status: "approved" },
      select: { id: true },
    });
    if (!m)
      return jsonError("فقط کارهای تاییدشدهٔ خودت را می‌توانی اضافه کنی.", 403);
  } else {
    const s = await db.submission.findFirst({
      where: { id: sourceId, user: user.username, status: "approved" },
      select: { id: true },
    });
    if (!s)
      return jsonError("فقط کارهای تاییدشدهٔ خودت را می‌توانی اضافه کنی.", 403);
  }

  try {
    const row = await db.showcaseItem.upsert({
      where: {
        username_sourceType_sourceId: {
          username: user.username,
          sourceType,
          sourceId,
        },
      },
      update: { hidden: false, title, description },
      create: {
        username: user.username,
        sourceType,
        sourceId,
        title,
        description,
      },
    });
    return Response.json({ ok: true, id: row.id });
  } catch {
    return jsonError("افزودن به نمایشگاه انجام نشد.", 500);
  }
}
