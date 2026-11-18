/**
 * منطق سمت سرور ماموریت‌ها — اعتبارسنجی ارسال، محدودیت فایل،
 * وضعیت بررسی معلم و همگام‌سازی آمار فقط با ماموریت‌های تاییدشده.
 */

import path from "path";
import { db } from "@/lib/db";
import { UPLOAD_DIR } from "@/lib/auth";
import { FIELDS, LEVELS } from "@/lib/missions-data";

export const MISSIONS_DIR = path.join(UPLOAD_DIR, "missions");

export type MissionKind = "practical" | "reading";
export type MissionStatus = "pending" | "approved" | "revision";

export const MISSION_STATUS_LABEL: Record<MissionStatus, string> = {
  pending: "در انتظار بررسی",
  approved: "تایید شده",
  revision: "نیاز به اصلاح",
};

/** محدودیت نوع و حجم فایل ارسالی ماموریت (سمت سرور اعمال می‌شود) */
export const MISSION_FILE_RULES: Record<string, number> = {
  "image/jpeg": 8 * 1024 * 1024,
  "image/png": 8 * 1024 * 1024,
  "image/webp": 8 * 1024 * 1024,
  "image/gif": 8 * 1024 * 1024,
  "application/pdf": 15 * 1024 * 1024,
  "video/mp4": 50 * 1024 * 1024,
  "video/webm": 50 * 1024 * 1024,
  "video/quicktime": 50 * 1024 * 1024,
};

export const MISSION_TEXT_MAX = 4000;
export const MISSION_LINK_MAX = 500;
export const MISSION_NOTE_MAX = 1000;

export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
export const LINK_RE = /^https?:\/\/[^\s]+$/i;

export function isMissionKind(v: unknown): v is MissionKind {
  return v === "practical" || v === "reading";
}

export function isMissionStatus(v: unknown): v is MissionStatus {
  return v === "pending" || v === "approved" || v === "revision";
}

/** اعتبارسنجی کلید ماموریت — کلید باید دقیقاً از اجزای معتبر ساخته شده باشد */
export function validateMissionKey(input: {
  field: unknown;
  level: unknown;
  day: unknown;
  idx: unknown;
}): { ok: true; key: string; field: string; level: string; day: string; idx: number; title: string } | { ok: false; error: string } {
  const field = String(input.field || "");
  const level = String(input.level || "");
  const day = String(input.day || "");
  const idx = Number(input.idx);

  if (!FIELDS[field]) return { ok: false, error: "رشتهٔ نامعتبر است." };
  if (!LEVELS[level]) return { ok: false, error: "سطح نامعتبر است." };
  if (!DAY_RE.test(day)) return { ok: false, error: "تاریخ ماموریت نامعتبر است." };
  if (!Number.isInteger(idx) || idx < 0 || idx >= FIELDS[field].missions.length)
    return { ok: false, error: "شمارهٔ ماموریت نامعتبر است." };

  return {
    ok: true,
    key: `${field}_${level}_${day}_${idx}`,
    field,
    level,
    day,
    idx,
    title: FIELDS[field].missions[idx],
  };
}

/** شکل ارسال برای مرورگر دانش‌آموز */
export function missionDto(m: {
  id: string;
  missionKey: string;
  field: string;
  level: string;
  day: string;
  idx: number;
  kind: string;
  title: string;
  text: string;
  link: string;
  fileName: string;
  fileType: string;
  status: string;
  teacherNote: string;
  reviewedAt: Date | null;
  updatedAt: Date;
}) {
  return {
    id: m.id,
    missionKey: m.missionKey,
    field: m.field,
    level: m.level,
    day: m.day,
    idx: m.idx,
    kind: m.kind,
    title: m.title,
    text: m.text,
    link: m.link,
    fileName: m.fileName,
    fileType: m.fileType,
    hasFile: !!m.fileName,
    status: m.status,
    teacherNote: m.teacherNote,
    reviewedAt: m.reviewedAt ? m.reviewedAt.toISOString() : null,
    updatedAt: m.updatedAt.toISOString(),
  };
}

/**
 * بازسازی نقشهٔ «انجام‌شده» از روی ماموریت‌های تاییدشده.
 * تنها منبع آمار (پیشرفت روز، استریک، هفته، نقشهٔ فعالیت، نشان، گواهی).
 */
export async function syncProgressFromMissions(username: string) {
  const approved = await db.missionSubmission.findMany({
    where: { username, status: "approved" },
    orderBy: { updatedAt: "desc" },
    select: { missionKey: true, field: true, level: true },
  });

  const completed: Record<string, boolean> = {};
  for (const a of approved) completed[a.missionKey] = true;

  const last =
    approved[0] ||
    (await db.missionSubmission.findFirst({
      where: { username },
      orderBy: { updatedAt: "desc" },
      select: { field: true, level: true },
    }));

  const field = last?.field || "";
  const level = last?.level || "";

  await db.progress.upsert({
    where: { username },
    update: {
      completedJson: JSON.stringify(completed),
      ...(field ? { field } : {}),
      ...(level ? { level } : {}),
    },
    create: {
      username,
      field,
      level,
      completedJson: JSON.stringify(completed),
    },
  });

  return completed;
}
