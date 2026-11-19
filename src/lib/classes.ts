/**
 * کمک‌کننده‌های کلاس — محدودسازی داده بر اساس کلاس کاربر.
 * همهٔ تصمیم‌های دسترسی در APIها با همین توابع گرفته می‌شوند.
 */

import { db } from "@/lib/db";

/** کلاسی که نماینده مسئول آن است (یا null) */
export async function classOfRep(username: string): Promise<string | null> {
  const cls = await db.schoolClass.findFirst({
    where: { repUsername: username },
    select: { id: true },
  });
  return cls?.id ?? null;
}

/** کلاس دانش‌آموز (یا null = بدون کلاس) */
export async function classOfStudent(username: string): Promise<string | null> {
  const u = await db.user.findUnique({
    where: { username },
    select: { classId: true },
  });
  return u?.classId ?? null;
}

/** شرط Prisma برای تکالیفی که یک دانش‌آموز باید ببیند: کلاس خودش + بدون کلاس */
export function studentAssignmentWhere(classId: string | null) {
  return classId
    ? { OR: [{ classId: null }, { classId }] }
    : { classId: null };
}
