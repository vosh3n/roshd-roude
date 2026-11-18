/**
 * برچسب فارسی نقش‌ها برای نمایش در رابط کاربری.
 * فقط متن نمایشی است؛ نام نقش در کد و دیتابیس همان admin/student/parent/superadmin می‌ماند.
 */
export type Role = "admin" | "student" | "parent" | "superadmin";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "معلم",
  student: "دانش‌آموز",
  parent: "والد",
  superadmin: "مدیر سایت",
};

export function roleLabel(role?: Role | string): string {
  if (
    role === "admin" ||
    role === "student" ||
    role === "parent" ||
    role === "superadmin"
  ) {
    return ROLE_LABEL[role];
  }
  return "";
}
