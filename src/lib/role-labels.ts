/**
 * برچسب فارسی نقش‌ها برای نمایش در رابط کاربری.
 * فقط متن نمایشی است؛ نام نقش در کد و دیتابیس همان admin/student/parent/superadmin می‌ماند.
 */
export type Role =
  | "admin"
  | "student"
  | "parent"
  | "superadmin"
  | "educational_rep";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "معلم",
  student: "دانش‌آموز",
  parent: "والد",
  superadmin: "مدیر سایت",
  educational_rep: "نمایندهٔ آموزشی",
};

export function roleLabel(role?: Role | string): string {
  if (
    role === "admin" ||
    role === "student" ||
    role === "parent" ||
    role === "superadmin" ||
    role === "educational_rep"
  ) {
    return ROLE_LABEL[role];
  }
  return "";
}
