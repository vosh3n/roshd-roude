/**
 * Seed حساب‌های اولیا + backfill نقش ادمین‌ها
 * اجرا: DATABASE_URL="file:../db/custom.db" bun prisma/seed-parents.ts
 *
 * - والدین: parent / parent2 / parent3 / parent4 با رمز 12345 و role "parent"
 * - backfill: هر نام کاربری موجود در جدول AdminAllow → role "admin"
 *   (سازگاری با ادمین‌های قبلی مثل Parsa)
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const db = new PrismaClient();

function hashPass(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return { salt, hash };
}

const PARENTS: { username: string; name: string }[] = [
  { username: "parent", name: "والد دانش‌آموز" },
  { username: "parent2", name: "والد ۲" },
  { username: "parent3", name: "والد ۳" },
  { username: "parent4", name: "والد ۴" },
];

const PARENT_PASSWORD = "12345";

async function main() {
  // ۱) والدین — upsert با role: "parent" (رمز همیشه همگام با 12345)
  for (const p of PARENTS) {
    const { salt, hash } = hashPass(PARENT_PASSWORD);
    await db.user.upsert({
      where: { username: p.username },
      update: { role: "parent", name: p.name, salt, hash },
      create: { username: p.username, name: p.name, salt, hash, role: "parent" },
    });
    console.log("parent seeded:", p.username);
  }

  // ۲) backfill نقش ادمین — هر کاربر allowlist شده ادمین است
  const allows = await db.adminAllow.findMany();
  for (const a of allows) {
    const u = await db.user.findUnique({ where: { username: a.username } });
    if (!u) {
      console.log("admin backfill skipped (no user):", a.username);
      continue;
    }
    if (u.role !== "admin") {
      await db.user.update({
        where: { username: a.username },
        data: { role: "admin" },
      });
      console.log("admin backfilled:", a.username);
    } else {
      console.log("admin already ok:", a.username);
    }
  }

  // ۳) اطمینان: هیچ دانش‌آموزی به‌اشتباه والد/ادمین نشده باشد — فقط گزارش
  const summary = await db.user.groupBy({
    by: ["role"],
    _count: { role: true },
  });
  console.log("role summary:", JSON.stringify(summary));
  console.log("✅ Seed parents done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
