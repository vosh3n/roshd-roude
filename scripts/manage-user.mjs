#!/usr/bin/env node
/**
 * مدیریت کاربران «مسیر رشد» — افزودن ممبر و تعیین دسترسی
 *
 * استفاده (از پوشهٔ پروژه):
 *   npm run user -- add <username> <password> "<نام>" [student|parent|admin]
 *   npm run user -- role <username> <student|parent|admin>
 *   npm run user -- passwd <username> <رمز-جدید>
 *   npm run user -- delete <username>
 *   npm run user -- list
 *
 * نقش‌ها (دسترسی‌ها):
 *   student → دانش‌آموز عادی (مأموریت‌ها، آزمون، تکالیف)
 *   parent  → فقط مشاهدهٔ پیشرفت همهٔ دانش‌آموزها و فایل تکالیف (بدون هیچ تغییر)
 *   admin   → معلم (همه‌چیز + بخش مدیریت ویدیوها/تکالیف در منو)
 *   educational_rep → نمایندهٔ آموزشی (فقط تکالیف کلاس)
 *
 * نکته: رمزها با scrypt هش می‌شوند (دقیقاً مثل خود سایت) و در دیتابیس
 * db/custom.db ذخیره می‌شوند. اگر سرور روشن است، بعد از تغییرات نیازی به
 * ری‌استارت نیست.
 */

import crypto from "node:crypto";
import fs from "node:fs";

/* ---------- بارگذاری .env اگر متغیر محیطی تنظیم نباشد ---------- */
if (!process.env.DATABASE_URL) {
  try {
    const env = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
    const m = env.match(/^DATABASE_URL\s*=\s*(.+)$/m);
    if (m)
      process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    /* .env نبود — Prisma خودش راه‌های دیگر را امتحان می‌کند */
  }
}

const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();

const ROLES = ["student", "parent", "admin", "educational_rep"];
const USERNAME_RE = /^[\w.\-]{3,32}$/;

function fail(msg) {
  console.error("✗ " + msg);
  process.exit(1);
}

function hashPass(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return { salt, hash };
}

function printUsage() {
  console.log(`
👥 مدیریت کاربران «مسیر رشد»

  npm run user -- add    <username> <password> "<نام>" [student|parent|admin|educational_rep]
  npm run user -- role   <username> <student|parent|admin|educational_rep>
  npm run user -- passwd <username> <رمز-جدید>
  npm run user -- delete <username>
  npm run user -- list

مثال‌ها:
  npm run user -- add ali_79 12345 "علی محمدی"
  npm run user -- add fatemeh_m 12345 "فاطمه رضایی" parent
  npm run user -- add parsa2 12345 "پارسا" admin
  npm run user -- role ali_79 parent
  npm run user -- list
`);
}

/* ---------- فرمان‌ها ---------- */

async function cmdAdd(args) {
  const [username, password, name, role = "student"] = args;
  if (!username || !password || !name)
    fail('کامل پر کن: npm run user -- add <username> <password> "<نام>" [نقش]');
  if (!USERNAME_RE.test(username))
    fail("نام کاربری فقط حروف/عدد/نقطه/خط تیره و بین ۳ تا ۳۲ کاراکتر باشد.");
  if (password.length < 4) fail("رمز عبور باید حداقل ۴ کاراکتر باشد.");
  if (!ROLES.includes(role))
    fail(`نقش باید یکی از این‌ها باشد: ${ROLES.join(" | ")}`);

  const exists = await db.user.findUnique({ where: { username } });
  if (exists) fail(`نام کاربری «${username}» قبلاً گرفته شده.`);

  const { salt, hash } = hashPass(password);
  const user = await db.user.create({
    data: { username, name: name.trim(), salt, hash, role },
  });
  console.log(`✓ کاربر ساخته شد: ${user.username} (${user.name}) — نقش: ${role}`);
  if (role === "parent")
    console.log("  این حساب فقط می‌تواند پیشرفت دانش‌آموزها را ببیند (بدون ویرایش).");
  if (role === "admin")
    console.log("  این دسترسی کامل دارد؛ با احتیاط بده.");
}

async function cmdRole(args) {
  const [username, role] = args;
  if (!username || !ROLES.includes(role))
    fail(`درست بنویس: npm run user -- role <username> <${ROLES.join("|")}>`);
  const user = await db.user.findUnique({ where: { username } });
  if (!user) fail(`کاربر «${username}» پیدا نشد.`);
  await db.user.update({ where: { username }, data: { role } });
  console.log(`✓ نقش «${username}» به ${role} تغییر کرد. (دسترسی بعد از ورود بعدی اعمال می‌شود)`);
}

async function cmdPasswd(args) {
  const [username, password] = args;
  if (!username || !password) fail("درست بنویس: npm run user -- passwd <username> <رمز-جدید>");
  if (password.length < 4) fail("رمز عبور باید حداقل ۴ کاراکتر باشد.");
  const user = await db.user.findUnique({ where: { username } });
  if (!user) fail(`کاربر «${username}» پیدا نشد.`);
  const { salt, hash } = hashPass(password);
  await db.user.update({ where: { username }, data: { salt, hash } });
  await db.session.deleteMany({ where: { user: { username } } }); // نشست‌های قدیمی باطل
  console.log(`✓ رمز «${username}» عوض شد. نشست‌های فعال او هم خارج شدند.`);
}

async function cmdDelete(args) {
  const [username] = args;
  if (!username) fail("درست بنویس: npm run user -- delete <username>");
  const user = await db.user.findUnique({ where: { username } });
  if (!user) fail(`کاربر «${username}» پیدا نشد.`);
  await db.user.delete({ where: { username } }); // پیشرفت و نشست‌ها هم حذف می‌شوند
  console.log(`✓ کاربر «${username}» (نقش: ${user.role}) به‌همراه پیشرفتش حذف شد.`);
}

async function cmdList() {
  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { username: "asc" }],
    select: { username: true, name: true, role: true, createdAt: true },
  });
  const roleFa = {
    student: "دانش‌آموز",
    parent: "والد",
    admin: "معلم",
    superadmin: "مدیر سایت",
    educational_rep: "نمایندهٔ آموزشی",
  };
  console.log(`\n👥 ${users.length} کاربر:\n`);
  console.log("  نام کاربری          نام                    نقش         ساخته‌شده");
  console.log("  " + "-".repeat(72));
  for (const u of users) {
    const d = new Date(u.createdAt).toLocaleDateString("fa-IR");
    console.log(
      "  " +
        String(u.username).padEnd(20) +
        String(u.name).padEnd(22) +
        (roleFa[u.role] || u.role).padEnd(11) +
        d
    );
  }
  console.log("");
}

/* ---------- اجرا ---------- */

const [cmd, ...args] = process.argv.slice(2);
try {
  if (cmd === "add") await cmdAdd(args);
  else if (cmd === "role") await cmdRole(args);
  else if (cmd === "passwd") await cmdPasswd(args);
  else if (cmd === "delete") await cmdDelete(args);
  else if (cmd === "list") await cmdList();
  else printUsage();
} catch (e) {
  fail(e?.message || String(e));
} finally {
  await db.$disconnect();
}
