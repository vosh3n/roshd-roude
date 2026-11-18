/**
 * مهاجرت دیتای پروژه اصلی (JSON) به دیتابیس Prisma + کپی فایل‌های آپلود
 * اجرا: bun prisma/seed-from-json.ts
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const db = new PrismaClient();

const SRC = "/home/z/project-extract/roshd/data";
const UPLOAD_DEST = "/home/z/my-project/db/uploads";

function readJson(f: string, fallback: any) {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return fallback;
  }
}

async function main() {
  fs.mkdirSync(UPLOAD_DEST, { recursive: true });

  // ۱) کاربران
  const users = readJson(path.join(SRC, "users.json"), {});
  for (const [username, u] of Object.entries<any>(users)) {
    await db.user.upsert({
      where: { username },
      update: { name: u.name },
      create: { username, name: u.name, salt: u.salt, hash: u.hash },
    });
    console.log("user:", username);
  }

  // ۲) ادمین‌ها
  const admins = readJson(path.join(SRC, "authorized-admins.json"), []);
  for (const username of admins) {
    await db.adminAllow.upsert({
      where: { username },
      update: {},
      create: { username: String(username).trim() },
    });
    console.log("admin:", username);
  }

  // ۳) ویدیوها + کپی فایل‌ها
  const content = readJson(path.join(SRC, "content.json"), {
    videos: [],
    assignments: [],
    submissions: [],
  });
  for (const v of content.videos) {
    const exists = await db.video.findUnique({ where: { id: v.id } });
    if (!exists) {
      await db.video.create({
        data: {
          id: v.id,
          title: v.title,
          fileId: v.file,
          filename: v.filename,
          type: v.type || "video/mp4",
        },
      });
      const src = path.join(SRC, "uploads", v.file);
      const dest = path.join(UPLOAD_DEST, v.file);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        console.log("video file copied:", v.file, fs.statSync(dest).size, "bytes");
      }
    }
  }

  // ۴) تکالیف
  for (const a of content.assignments) {
    const exists = await db.assignment.findUnique({ where: { id: a.id } });
    if (!exists) {
      await db.assignment.create({
        data: {
          id: a.id,
          title: a.title,
          body: a.body,
          deadline: new Date(a.deadline),
        },
      });
      console.log("assignment:", a.id);
    }
  }

  // ۵) ارسال‌ها + کپی فایل‌ها
  for (const s of content.submissions) {
    const exists = await db.submission.findUnique({ where: { id: s.id } });
    if (!exists) {
      await db.submission.create({
        data: {
          id: s.id,
          assignmentId: s.assignmentId,
          user: s.user,
          fileId: s.file,
          fileName: s.fileName,
          extraId: s.extra || "",
          extraName: s.extraName || "",
          note: s.note || "",
          at: new Date(s.at),
        },
      });
      const src = path.join(SRC, "uploads", s.file);
      const dest = path.join(UPLOAD_DEST, s.file);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        console.log("submission file copied:", s.file);
      }
      if (s.extra) {
        const src2 = path.join(SRC, "uploads", s.extra);
        const dest2 = path.join(UPLOAD_DEST, s.extra);
        if (fs.existsSync(src2) && !fs.existsSync(dest2)) {
          fs.copyFileSync(src2, dest2);
          console.log("submission extra copied:", s.extra);
        }
      }
    }
  }

  console.log("✅ Migration done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
