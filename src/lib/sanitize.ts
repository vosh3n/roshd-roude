/**
 * پاک‌سازی ورودی‌های متنی — همهٔ APIها از همین توابع استفاده می‌کنند.
 * - کاراکترهای کنترلی حذف می‌شوند
 * - < و > خنثی می‌شوند (متن هیچ‌جا به‌صورت HTML رندر نمی‌شود، ولی پیشگیری لازم است)
 * - طول متن محدود می‌شود
 */

const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** متن تک‌خطی (عنوان، نام، موضوع) */
export function cleanText(input: unknown, max = 200): string {
  return String(input ?? "")
    .replace(CONTROL_RE, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** متن چندخطی (توضیح، پیام، اطلاعیه) — خطوط جدید حفظ می‌شوند */
export function cleanMultiline(input: unknown, max = 2000): string {
  return String(input ?? "")
    .replace(/\r\n/g, "\n")
    .replace(CONTROL_RE, "")
    .replace(/[<>]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

/** تاریخ معتبر؟ (رشتهٔ ISO یا Date) */
export function validDate(v: unknown): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}
