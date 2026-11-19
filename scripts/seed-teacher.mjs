/**
 * ساخت حساب «معلم» — نقش admin (در رابط «معلم» نمایش داده می‌شود)
 *
 *   npm run seed:teacher
 *   npm run seed:teacher -- --reset-password
 *
 * - نام کاربری و رمز از .env خوانده می‌شوند: TEACHER_USERNAME / TEACHER_PASSWORD
 * - رمز با همان scrypt پروژه (src/lib/auth.ts) هش می‌شود؛ رمز خام ذخیره نمی‌شود.
 * - ایدمپوتنت: اگر حساب از قبل معلم باشد، رمزش را عوض نمی‌کند
 *   (تا رمزی که معلم از تنظیمات عوض کرده پاک نشود). با --reset-password
 *   رمز دوباره از .env ست می‌شود.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

/* ---------- خواندن .env بدون وابستگی اضافه (و بدون چاپ مقدارها) ---------- */
function loadEnvFile() {
  const file = path.join(process.cwd(), ".env");
  if (!fs.existsSync(file)) return;
  const raw = fs.readFileSync(file, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

function hashPass(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return { salt, hash };
}

async function main() {
  loadEnvFile();

  const username = (process.env.TEACHER_USERNAME || "").trim();
  const password = process.env.TEACHER_PASSWORD || "";
  const resetPassword = process.argv.includes("--reset-password");

  if (!username || !password) {
    console.error(
      "[seed:teacher] TEACHER_USERNAME و TEACHER_PASSWORD باید در .env باشند."
    );
    process.exit(1);
  }
  if (password.length < 5) {
    console.error("[seed:teacher] رمز معلم باید حداقل ۵ نویسه باشد.");
    process.exit(1);
  }

  const db = new PrismaClient();

  try {
    const existing = await db.user.findUnique({ where: { username } });

    if (!existing) {
      const { salt, hash } = hashPass(password);
      await db.user.create({
        data: {
          username,
          name: process.env.TEACHER_NAME || "معلم",
          email: process.env.TEACHER_EMAIL || "teacher@roshd.local",
          salt,
          hash,
          role: "admin",
        },
      });
      console.log(`[seed:teacher] حساب معلم ساخته شد: ${username}`);
    } else if (existing.role !== "admin") {
      const { salt, hash } = hashPass(password);
      await db.user.update({
        where: { username },
        data: { role: "admin", salt, hash },
      });
      console.log(
        `[seed:teacher] حساب موجود «${username}» به معلم ارتقا یافت (رمز از .env ست شد).`
      );
    } else if (resetPassword) {
      const { salt, hash } = hashPass(password);
      await db.user.update({ where: { username }, data: { salt, hash } });
      console.log(`[seed:teacher] رمز «${username}» از .env بازنشانی شد.`);
    } else {
      console.log(
        `[seed:teacher] «${username}» از قبل معلم است؛ چیزی تغییر نکرد.`
      );
    }

    const count = await db.user.count({ where: { role: "admin" } });
    console.log(`[seed:teacher] تعداد معلم‌ها: ${count}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("[seed:teacher] خطا:", e?.message || e);
  process.exit(1);
});
