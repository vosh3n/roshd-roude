/**
 * ساخت (یا ارتقای) حساب «مدیر سایت» — superadmin
 *
 *   npm run seed:superadmin
 *   npm run seed:superadmin -- --reset-password
 *
 * - نام کاربری و رمز از .env خوانده می‌شوند: SUPERADMIN_USERNAME / SUPERADMIN_PASSWORD
 * - رمز با همان scrypt پروژه (src/lib/auth.ts) هش می‌شود؛ رمز خام ذخیره نمی‌شود.
 * - ایدمپوتنت: اگر کاربر از قبل superadmin باشد، رمزش را عوض نمی‌کند
 *   (تا رمزی که مدیر از صفحهٔ تنظیمات عوض کرده پاک نشود). با --reset-password
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

  const username = (process.env.SUPERADMIN_USERNAME || "").trim();
  const password = process.env.SUPERADMIN_PASSWORD || "";
  const resetPassword = process.argv.includes("--reset-password");

  if (!username || !password) {
    console.error(
      "[seed:superadmin] SUPERADMIN_USERNAME و SUPERADMIN_PASSWORD باید در .env باشند."
    );
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("[seed:superadmin] رمز مدیر سایت باید حداقل ۶ نویسه باشد.");
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
          name: process.env.SUPERADMIN_NAME || "مدیر سایت",
          email: process.env.SUPERADMIN_EMAIL || "superadmin@roshd.local",
          salt,
          hash,
          role: "superadmin",
        },
      });
      console.log(`[seed:superadmin] حساب مدیر سایت ساخته شد: ${username}`);
    } else if (existing.role !== "superadmin") {
      const { salt, hash } = hashPass(password);
      await db.user.update({
        where: { username },
        data: { role: "superadmin", salt, hash },
      });
      console.log(
        `[seed:superadmin] حساب موجود «${username}» به مدیر سایت ارتقا یافت (رمز از .env ست شد).`
      );
    } else if (resetPassword) {
      const { salt, hash } = hashPass(password);
      await db.user.update({ where: { username }, data: { salt, hash } });
      console.log(`[seed:superadmin] رمز «${username}» از .env بازنشانی شد.`);
    } else {
      console.log(
        `[seed:superadmin] «${username}» از قبل مدیر سایت است؛ چیزی تغییر نکرد.`
      );
    }

    // نقش مدیر سایت نباید در allowlist معلم‌ها گم شود؛ ورود از role خوانده می‌شود
    const count = await db.user.count({ where: { role: "superadmin" } });
    console.log(`[seed:superadmin] تعداد مدیران سایت: ${count}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("[seed:superadmin] خطا:", e?.message || e);
  process.exit(1);
});
