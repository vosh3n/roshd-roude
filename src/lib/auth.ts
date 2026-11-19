/**
 * ابزارهای احراز هویت — هش رمز با scrypt (سازگار با پروژه اصلی)
 */

import crypto from "crypto";
import path from "path";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

/** پوشهٔ آپلودها — نسبت به ریشهٔ پروژه، روی هر ماشینی کار می‌کند */
export const UPLOAD_DIR = path.join(process.cwd(), "db", "uploads");
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

/** عکس پروفایل — زیرپوشهٔ آواتارها داخل همان پوشهٔ آپلودها */
export const AVATAR_DIR = path.join(UPLOAD_DIR, "avatars");
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_AVATAR_SIZE = 3 * 1024 * 1024;

/** آدرس عکس پروفایل؛ با عوض شدن عکس، ?v هم عوض می‌شود تا کش مرورگر تازه شود */
export function avatarUrl(username: string, avatar?: string | null) {
  if (!avatar) return "";
  const v = crypto.createHash("sha1").update(avatar).digest("hex").slice(0, 10);
  return `/api/avatar/${encodeURIComponent(username)}?v=${v}`;
}

export function hashPass(
  password: string,
  salt = crypto.randomBytes(16).toString("hex")
) {
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return { salt, hash };
}

export function checkPass(password: string, salt: string, hash: string) {
  const h = crypto.scryptSync(password, salt, 32);
  const saved = Buffer.from(hash, "hex");
  return saved.length === h.length && crypto.timingSafeEqual(saved, h);
}

export type Role =
  | "student"
  | "admin"
  | "parent"
  | "superadmin"
  | "educational_rep";

/** مدیر سایت — بالاترین سطح دسترسی */
export function isSuperAdmin(role?: string | null) {
  return role === "superadmin";
}

/** معلم یا مدیر سایت — دسترسی به بخش‌های مدیریتی محتوا */
export function isTeacher(role?: string | null) {
  return role === "admin" || role === "superadmin";
}

/** نمایندهٔ آموزشی — فقط تکالیف و ارسال‌های آن */
export function isEducationalRep(role?: string | null) {
  return role === "educational_rep";
}

/** هر کسی که اجازهٔ ساخت/ویرایش تکلیف و بررسی ارسال را دارد */
export function canManageAssignments(role?: string | null) {
  return isTeacher(role) || isEducationalRep(role);
}

/** والد، معلم یا مدیر سایت — دیدن دادهٔ دانش‌آموزان */
export function canViewStudents(role?: string | null) {
  return isTeacher(role) || role === "parent";
}

export async function roleOf(username: string): Promise<Role> {
  try {
    const user = await db.user.findUnique({
      where: { username },
      select: { role: true },
    });
    if (user?.role) return user.role as Role;
  } catch {
    // کلاینت Prisma ممکن است لحظه‌ای قدیمی باشد؛ پیش‌فرض امن دانش‌آموز است
  }
  return "student";
}

export async function currentUser() {
  const store = await cookies();
  const sid = store.get("sid")?.value;
  if (!sid) return null;
  const session = await db.session.findUnique({
    where: { id: sid },
    include: { user: true },
  });
  if (!session) return null;
  // حساب غیرفعال‌شده (مثلاً نمایندهٔ آموزشی) دیگر نشست معتبر ندارد
  if (session.user.active === false) return null;
  const role = await roleOf(session.user.username);
  return {
    username: session.user.username,
    name: session.user.name,
    email: session.user.email || "",
    role,
    avatar: avatarUrl(session.user.username, session.user.avatar),
    guideSeen: session.user.guideSeen !== false,
    classId: session.user.classId || "",
  };
}

export async function createSession(username: string) {
  const sid = crypto.randomBytes(24).toString("hex");
  const user = await db.user.findUnique({ where: { username } });
  if (!user) return null;
  await db.session.create({ data: { id: sid, userId: user.id } });
  return sid;
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

/** خطای واقعی به‌صورت یک خط کوتاه — خطای Prisma جزئیات مهمش را وسط پیام می‌گذارد */
export function errDetail(e: unknown): string {
  const anyE = e as any;
  const full = String(anyE?.message ?? (typeof e === "string" ? e : "")).trim();
  if (!full) return String(anyE?.name ?? "خطای ناشناخته");
  // خط «error: ...» معتبرترین بخش پیام‌های Prisma است
  const errLine = full.match(/error:\s*(.+)/)?.[1]?.trim();
  const first =
    errLine || full.split("\n").find((l) => l.trim()) || full;
  return first.trim().slice(0, 160);
}
