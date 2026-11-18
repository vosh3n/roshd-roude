/**
 * ساخت کاربر ادمین پیش‌فرض در اولین اجرا (اگر هنوز ادمینی وجود نداشته باشد)
 */

import { db } from "@/lib/db";
import { hashPass } from "@/lib/auth";

export async function ensureAdmin() {
  try {
    const existing = await db.user.findFirst({
      where: { role: "admin" },
      select: { id: true },
    });
    if (existing) return;

    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const { salt, hash } = hashPass(password);

    await db.user.upsert({
      where: { username },
      update: { role: "admin", salt, hash },
      create: {
        username,
        name: "معلم سامانه",
        role: "admin",
        salt,
        hash,
      },
    });
    console.log(`[admin-seed] admin user ready (username: ${username})`);
  } catch (e) {
    console.error("[admin-seed] failed:", e);
  }
}
