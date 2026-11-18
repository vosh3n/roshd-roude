/**
 * برچسب فارسی نقش‌ها برای نمایش در رابط کاربری.
 * فقط متن نمایشی است؛ نام نقش در کد و دیتابیس همان admin/student/parent می‌ماند.
 */
export type Role = "admin" | "student" | "parent";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "معلم",
  student: "دانش‌آموز",
  parent: "والد",
};

export function roleLabel(role?: Role | string): string {
  if (role === "admin" || role === "student" || role === "parent") {
    return ROLE_LABEL[role];
  }
  return "";
}
