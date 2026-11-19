/**
 * آماده‌سازی حساب‌های پایه — هر بار سرور بالا می‌آید تضمین می‌کند
 * حساب مدیر اصلی وجود داشته باشد؛ بنابراین با ری‌ست شدن/عوض شدن دیتابیس
 * یا روشن-خاموش کردن لپ‌تاپ، دسترسی مدیر از بین نمی‌رود.
 */

import { db } from "@/lib/db";
import { hashPass } from "@/lib/auth";

export const MAIN_ADMIN = {
  username: "amirmohamad",
  name: "امیر محمد",
  password: "12345",
};

/** ساخت (یا ترمیم) حساب مدیر اصلی؛ ایدمپوتنت و ارزان است
 *  (نتیجه کش نمی‌شود تا اگر دیتابیس وسط کار ری‌ست شد، حساب دوباره ساخته شود) */
export async function ensureAdmin() {
  try {
    const existing = await db.user.findUnique({
      where: { username: MAIN_ADMIN.username },
      select: { id: true, role: true },
    });

    if (!existing) {
      const { salt, hash } = hashPass(MAIN_ADMIN.password);
      await db.user.create({
        data: {
          username: MAIN_ADMIN.username,
          name: MAIN_ADMIN.name,
          salt,
          hash,
          role: "admin",
        },
      });
    } else if (existing.role !== "admin" && existing.role !== "superadmin") {
      // نقش «مدیر سایت» را پایین نمی‌آوریم
      await db.user.update({
        where: { username: MAIN_ADMIN.username },
        data: { role: "admin" },
      });
    }

  } catch (e) {
    // دیتابیس ممکن است هنوز آماده نباشد؛ بار بعد دوباره تلاش می‌شود
    console.error("[bootstrap] ensureAdmin failed:", e);
  }
}

/** یکسان‌سازی شناسهٔ ورود: «amir mohamad» → «amirmohamad» */
export function normalizeLoginId(raw: string) {
  return raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
}
