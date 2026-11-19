/**
 * پاک کردن کامل دادهٔ تست — فقط رکوردهای isTest
 *   npm run seed:test:remove
 * به دادهٔ واقعی کاربران دست نمی‌زند (حساب‌هایی که isTest نیستند می‌مانند).
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const missionsDir = path.join(process.cwd(), "db", "uploads", "missions");
const uploadsDir = path.join(process.cwd(), "db", "uploads");

async function main() {
  try {
    const testUsers = await db.user.findMany({
      where: { isTest: true },
      select: { username: true },
    });
    const names = testUsers.map((u) => u.username);

    const missions = await db.missionSubmission.findMany({
      where: { isTest: true },
      select: { fileId: true },
    });
    const subs = await db.submission.findMany({
      where: { isTest: true },
      select: { fileId: true, extraId: true },
    });

    const showcase = await db.showcaseItem.deleteMany({ where: { isTest: true } });
    const reports = await db.weeklyReport.deleteMany({ where: { isTest: true } });
    const submissions = await db.submission.deleteMany({ where: { isTest: true } });
    const missionRows = await db.missionSubmission.deleteMany({ where: { isTest: true } });
    const assignments = await db.assignment.deleteMany({ where: { isTest: true } });

    /* فایل‌های آزمون */
    for (const m of missions) {
      if (!m.fileId) continue;
      try {
        fs.unlinkSync(path.join(missionsDir, m.fileId));
      } catch {}
    }
    for (const s of subs) {
      for (const f of [s.fileId, s.extraId]) {
        if (!f) continue;
        try {
          fs.unlinkSync(path.join(uploadsDir, f));
        } catch {}
      }
    }

    /* پاک کردن کاربران تست (پیشرفت و نشست‌ها وابسته‌اند) */
    let deletedUsers = 0;
    for (const username of names) {
      const u = await db.user.findUnique({ where: { username }, select: { id: true } });
      if (u) await db.session.deleteMany({ where: { userId: u.id } });
      await db.progress.deleteMany({ where: { username } });
      await db.weeklyReport.deleteMany({ where: { username } });
      await db.showcaseItem.deleteMany({ where: { username } });
      await db.missionSubmission.deleteMany({ where: { username } });
      await db.submission.deleteMany({ where: { user: username } });
      await db.passwordReset.deleteMany({ where: { username } });
      const del = await db.user.deleteMany({ where: { username, isTest: true } });
      deletedUsers += del.count;
      /* پیوند والد به دانش‌آموز در حساب واقعی پاک می‌شود */
      await db.user.updateMany({
        where: { parentUsername: username },
        data: { parentUsername: "" },
      });
    }

    console.log(
      `[seed:test:remove] ${deletedUsers} حساب، ${assignments.count} تکلیف، ${submissions.count} ارسال، ${missionRows.count} ماموریت، ${showcase.count} نمایشگاه و ${reports.count} گزارش تست پاک شد.`
    );
  } catch (e) {
    console.error("[seed:test:remove] خطا:", e?.message || e);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

main();
