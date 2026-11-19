/**
 * ساخت حساب «نمایندهٔ آموزشی» — نقش educational_rep
 *
 *   npm run seed:rep
 *   npm run seed:rep -- --reset-password
 *
 * - نام کاربری و رمز از .env خوانده می‌شوند: REP_USERNAME / REP_PASSWORD
 *   (کلاس و نام نمایشی هم اختیاری: REP_NAME / REP_CLASS)
 * - رمز با همان scrypt پروژه (src/lib/auth.ts) هش می‌شود؛ رمز خام ذخیره نمی‌شود.
 * - ایدمپوتنت: اگر حساب از قبل نماینده باشد، رمزش را عوض نمی‌کند
 *   (تا رمزی که از تنظیمات عوض شده پاک نشود). با --reset-password رمز
 *   دوباره از .env ست می‌شود.
 * - اگر همان نام کاربری با نقش دیگری وجود داشته باشد، هیچ تغییری نمی‌دهد.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

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

  const username = (process.env.REP_USERNAME || "").trim();
  const password = process.env.REP_PASSWORD || "";
  const classRoom = (process.env.REP_CLASS || "").trim();
  const resetPassword = process.argv.includes("--reset-password");

  if (!username || !password) {
    console.error(
      "[seed:rep] REP_USERNAME و REP_PASSWORD باید در .env باشند."
    );
    process.exit(1);
  }
  if (password.length < 5) {
    console.error("[seed:rep] رمز نماینده باید حداقل ۵ نویسه باشد.");
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
          name: process.env.REP_NAME || "نمایندهٔ آموزشی",
          // ثبت‌نام ایمیل اختیاری است؛ برای این حساب یک ایمیل ساختگی می‌گذاریم
          email: process.env.REP_EMAIL || null,
          salt,
          hash,
          role: "educational_rep",
          classRoom,
          active: true,
        },
      });
      console.log(`[seed:rep] حساب نمایندهٔ آموزشی ساخته شد: ${username}`);
    } else if (existing.role !== "educational_rep") {
      console.error(
        `[seed:rep] «${username}» از قبل با نقش «${existing.role}» وجود دارد؛ برای جلوگیری از بازنویسی نقشی، کاری انجام نشد.`
      );
      process.exit(1);
    } else if (resetPassword) {
      const { salt, hash } = hashPass(password);
      await db.user.update({ where: { username }, data: { salt, hash } });
      console.log(`[seed:rep] رمز «${username}» از .env بازنشانی شد.`);
    } else {
      console.log(
        `[seed:rep] «${username}» از قبل نمایندهٔ آموزشی است؛ چیزی تغییر نکرد.`
      );
    }

    const count = await db.user.count({ where: { role: "educational_rep" } });
    console.log(`[seed:rep] تعداد نماینده‌های آموزشی: ${count}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("[seed:rep] خطا:", e?.message || e);
  process.exit(1);
});
