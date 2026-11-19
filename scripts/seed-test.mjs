/**
 * دادهٔ تست برای دیدن همهٔ پنل‌ها — والد + دانش‌آموز + دادهٔ نمونه
 *
 *   npm run seed:test
 *   npm run seed:test:remove   ← پاک کردن کامل دادهٔ تست
 *
 * - نام کاربری/رمزی از .env خوانده می‌شود (پیش‌فرض‌ها همان مقادیر زیر):
 *   PARENT_TEST_USERNAME / PARENT_TEST_PASSWORD
 *   STUDENT_TEST_USERNAME / STUDENT_TEST_PASSWORD
 * - رمزها با همان scrypt پروژه هش می‌شوند؛ رمز خام در دیتابیس نیست.
 * - ایدمپوتنت: اجرای دوباره دادهٔ تکراری نمی‌سازد.
 * - همهٔ رکوردها با isTest علامت می‌خورند تا seed:test:remove فقط همان‌ها را پاک کند.
 * - رمزها هرگز چاپ نمی‌شوند.
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
    )
      value = value.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

function hashPass(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return { salt, hash };
}

function dayKey(d) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function saturdayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 1) % 7));
  return d;
}

const TITLES = [
  "یک صفحهٔ HTML با اسم خودت و یک جمله دربارهٔ چیزی که دوست داری",
  "پنج تگ HTML را با یک مثال کوچک امتحان کن",
  "یک فرم ورود ساده بساز",
  "کارت پروفایلی با عکس گرد، اسم و یک جملهٔ معرفی",
  "دکمه‌ای که با رفتن موس رنگ عوض کند",
  "سه ویژگی CSS را روی یک صفحه امتحان کن",
  "برنامهٔ هفتگی‌ات را به جدول HTML تبدیل کن",
  "ماشین‌حساب دوعددی با JavaScript بساز",
];

const ART = [
  {
    name: "art-workspace.svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7bdff2"/><stop offset="1" stop-color="#5b8def"/></linearGradient></defs><rect width="640" height="480" rx="28" fill="url(#g)"/><rect x="70" y="120" width="500" height="270" rx="18" fill="#082033" opacity=".85"/><rect x="95" y="150" width="250" height="14" rx="7" fill="#7bdff2"/><rect x="95" y="180" width="380" height="10" rx="5" fill="#e8f7ff" opacity=".7"/><rect x="95" y="205" width="320" height="10" rx="5" fill="#e8f7ff" opacity=".5"/><rect x="95" y="245" width="150" height="90" rx="12" fill="#2ec4a6" opacity=".8"/><circle cx="470" cy="300" r="55" fill="#ffd166" opacity=".85"/></svg>`,
  },
  {
    name: "art-profile.svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd166"/><stop offset="1" stop-color="#f2994a"/></linearGradient></defs><rect width="640" height="480" rx="28" fill="#10251c"/><circle cx="320" cy="190" r="90" fill="url(#p)"/><circle cx="320" cy="165" r="38" fill="#10251c" opacity=".7"/><rect x="250" y="300" width="140" height="16" rx="8" fill="#e9fff5"/><rect x="215" y="335" width="210" height="10" rx="5" fill="#e9fff5" opacity=".55"/><circle cx="150" cy="380" r="26" fill="#2ec4a6" opacity=".8"/><circle cx="500" cy="120" r="18" fill="#b07cff" opacity=".8"/></svg>`,
  },
  {
    name: "art-calc.svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" rx="28" fill="#0d1b2a"/><rect x="200" y="80" width="240" height="320" rx="26" fill="#16324a"/><rect x="225" y="105" width="190" height="60" rx="12" fill="#7bdff2" opacity=".9"/><g fill="#5b8def"><rect x="225" y="185" width="55" height="55" rx="12"/><rect x="295" y="185" width="55" height="55" rx="12"/><rect x="365" y="185" width="50" height="55" rx="12"/><rect x="225" y="255" width="55" height="55" rx="12"/><rect x="295" y="255" width="55" height="55" rx="12"/><rect x="365" y="255" width="50" height="55" rx="12"/></g><rect x="225" y="325" width="190" height="50" rx="14" fill="#2ec4a6"/></svg>`,
  },
];

async function main() {
  loadEnvFile();

  const parentUsername = (process.env.PARENT_TEST_USERNAME || "parents").trim();
  const parentPassword = process.env.PARENT_TEST_PASSWORD || "12345";
  const studentUsername = (process.env.STUDENT_TEST_USERNAME || "test-student").trim();
  const studentPassword = process.env.STUDENT_TEST_PASSWORD || "12345";
  const className = "کلاس ۱";

  if (parentPassword.length < 5 || studentPassword.length < 5) {
    console.error("[seed:test] رمزهای تست باید حداقل ۵ نویسه باشند.");
    process.exit(1);
  }
  if (parentUsername === studentUsername) {
    console.error("[seed:test] نام کاربری والد و دانش‌آموز نباید یکی باشد.");
    process.exit(1);
  }

  const db = new PrismaClient();
  const missionsDir = path.join(process.cwd(), "db", "uploads", "missions");
  const uploadsDir = path.join(process.cwd(), "db", "uploads");
  fs.mkdirSync(missionsDir, { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, "submissions"), { recursive: true });

  try {
    /* ---------- کلاس ۱ ---------- */
    let cls = await db.schoolClass.findUnique({ where: { name: className } });
    if (!cls)
      cls = await db.schoolClass.create({
        data: { name: className, year: "۱۴۰۵", active: true },
      });

    /* ---------- حساب والد ---------- */
    const parentPass = hashPass(parentPassword);
    let parent = await db.user.findUnique({ where: { username: parentUsername } });
    if (parent) {
      if (parent.role !== "parent") {
        console.error(
          `[seed:test] «${parentUsername}» با نقش «${parent.role}» وجود دارد؛ دست نزدم.`
        );
        process.exit(1);
      }
      await db.user.update({
        where: { username: parentUsername },
        data: {
          salt: parentPass.salt,
          hash: parentPass.hash,
          active: true,
          // اگر حساب از قبل واقعی بوده، isTest می‌ماند تا پاک‌سازی حذفش نکند
          isTest: parent.isTest,
        },
      });
      parent = await db.user.findUnique({ where: { username: parentUsername } });
      console.log(`[seed:test] والد موجود به‌روز شد: ${parentUsername}`);
    } else {
      await db.user.create({
        data: {
          username: parentUsername,
          name: "والد نمونه",
          email: null,
          salt: parentPass.salt,
          hash: parentPass.hash,
          role: "parent",
          isTest: true,
          active: true,
        },
      });
      console.log(`[seed:test] والد تست ساخته شد: ${parentUsername}`);
    }

    /* ---------- حساب دانش‌آموز ---------- */
    const studentPass = hashPass(studentPassword);
    const student = await db.user.findUnique({ where: { username: studentUsername } });
    if (student && student.role !== "student") {
      console.error(
        `[seed:test] «${studentUsername}» با نقش «${student.role}» وجود دارد؛ دست نزدم.`
      );
      process.exit(1);
    }
    if (student) {
      await db.user.update({
        where: { username: studentUsername },
        data: {
          salt: studentPass.salt,
          hash: studentPass.hash,
          parentUsername,
          classId: cls.id,
          isTest: true,
          active: true,
        },
      });
    } else {
      await db.user.create({
        data: {
          username: studentUsername,
          name: "دانش‌آموز نمونه",
          email: null,
          salt: studentPass.salt,
          hash: studentPass.hash,
          role: "student",
          parentUsername,
          classId: cls.id,
          isTest: true,
          guideSeen: true,
          active: true,
        },
      });
    }
    console.log(`[seed:test] دانش‌آموز تست: ${studentUsername} در «${cls.name}»`);

    /* وضعیت پیشرفت */
    const progress = await db.progress.findUnique({ where: { username: studentUsername } });
    const completed = progress ? JSON.parse(progress.completedJson || "{}") : {};
    await db.progress.upsert({
      where: { username: studentUsername },
      update: { field: "computer", level: "beginner" },
      create: {
        username: studentUsername,
        field: "computer",
        level: "beginner",
        completedJson: JSON.stringify(completed),
        badgesJson: JSON.stringify(["start", "streak3"]),
      },
    });

    /* ---------- ماموریت‌های نمونهٔ دو هفتهٔ اخیر ---------- */
    const today = new Date();
    const sat = saturdayOf(today);
    const days = [];
    for (let i = 0; i < 14; i++) days.push(dayKey(addDays(sat, -7 + i)));
    days.push(dayKey(today));

    const artFiles = ART.map((a) => {
      const fileId = "test-" + a.name;
      fs.writeFileSync(path.join(missionsDir, fileId), a.svg, "utf8");
      return fileId;
    });

    let n = 0;
    for (const day of days) {
      for (let k = 0; k < 2; k++) {
        const idx = (n + k) % TITLES.length;
        const key = `computer_beginner_${day}_${idx}`;
        const withArt = n % 4 === 0 && k === 0;
        const at = new Date(day + "T12:00:00");
        await db.missionSubmission.upsert({
          where: { username_missionKey: { username: studentUsername, missionKey: key } },
          update: { status: "approved", isTest: true },
          create: {
            username: studentUsername,
            missionKey: key,
            field: "computer",
            level: "beginner",
            day,
            idx,
            kind: "practical",
            title: TITLES[idx],
            text: "کار این ماموریت را انجام دادم و نتیجه‌اش را فرستادم.",
            fileId: withArt ? artFiles[n % artFiles.length] : "",
            fileName: withArt ? "کار-نمونه.svg" : "",
            fileType: withArt ? "image/svg+xml" : "",
            status: "approved",
            teacherNote: "آفرین! تمیز و مرتب انجام شده.",
            reviewedAt: at,
            isTest: true,
            createdAt: at,
          },
        });
      }
      n += 2;
    }

    /* دو ماموریت در انتظار و یکی نیازمند اصلاح — امروز */
    const todayKey = dayKey(today);
    await db.missionSubmission.upsert({
      where: {
        username_missionKey: {
          username: studentUsername,
          missionKey: `computer_beginner_${todayKey}_6`,
        },
      },
      update: { status: "pending", isTest: true },
      create: {
        username: studentUsername,
        missionKey: `computer_beginner_${todayKey}_6`,
        field: "computer",
        level: "beginner",
        day: todayKey,
        idx: 6,
        kind: "practical",
        title: TITLES[6],
        text: "جدول را ساختم ولی هنوز رنگ‌ها را مرتب نکردم.",
        status: "pending",
        isTest: true,
      },
    });
    await db.missionSubmission.upsert({
      where: {
        username_missionKey: {
          username: studentUsername,
          missionKey: `computer_beginner_${todayKey}_7`,
        },
      },
      update: { status: "revision", isTest: true },
      create: {
        username: studentUsername,
        missionKey: `computer_beginner_${todayKey}_7`,
        field: "computer",
        level: "beginner",
        day: todayKey,
        idx: 7,
        kind: "practical",
        title: TITLES[7],
        text: "ماشین‌حساب را نوشتم ولی جمع دو عدد اعشاری کار نمی‌کند.",
        status: "revision",
        teacherNote: "خیلی نزدیک شدی؛ فقط بخش اعشار را اصلاح کن.",
        reviewedAt: new Date(),
        isTest: true,
      },
    });

    /* ---------- تکالیف و ارسال‌ها ---------- */
    const assignmentSeed = [
      {
        id: "test-assign-1",
        title: "جدول برنامهٔ هفتگی",
        body: "برنامهٔ هفتهٔ آینده‌ات را در یک جدول HTML بساز و بفرست.",
        deadline: addDays(today, -2),
        status: "approved",
        feedback: "جدول خوانا و مرتب است — آفرین!",
        late: false,
      },
      {
        id: "test-assign-2",
        title: "پوستر معرفی خودم",
        body: "یک پوستر ساده با نام و یک جمله دربارهٔ خودت طراحی کن.",
        deadline: addDays(today, 3),
        status: "pending",
        feedback: "",
        late: false,
      },
      {
        id: "test-assign-3",
        title: "توضیح یک مفهوم",
        body: "تفاوت IP و DNS را با زبان خودت توضیح بده.",
        deadline: addDays(today, -6),
        status: "revision",
        feedback: "کمی کوتاه است؛ با یک مثال دفترچهٔ تلفن کاملش کن.",
        late: true,
      },
    ];

    for (const a of assignmentSeed) {
      await db.assignment.upsert({
        where: { id: a.id },
        update: { classId: cls.id, isTest: true },
        create: {
          id: a.id,
          title: a.title,
          body: a.body,
          audience: cls.name,
          classId: cls.id,
          deadline: a.deadline,
          isTest: true,
          createdAt: addDays(today, -9),
        },
      });

      const fileName = "پاسخ-نمونه.txt";
      const fileId = "submissions/test-" + a.id + ".txt";
      fs.writeFileSync(
        path.join(uploadsDir, fileId),
        `پاسخ نمونه برای تکلیف «${a.title}» — دادهٔ تست\n`,
        "utf8"
      );
      await db.submission.upsert({
        where: { id: "test-sub-" + a.id },
        update: {
          status: a.status,
          feedback: a.feedback,
          isTest: true,
        },
        create: {
          id: "test-sub-" + a.id,
          assignmentId: a.id,
          user: studentUsername,
          fileId,
          fileName,
          note: "پاسخم را در فایل فرستادم.",
          status: a.status,
          feedback: a.feedback,
          reviewedAt: a.status === "pending" ? null : new Date(),
          isTest: true,
          at: addDays(today, a.late ? -1 : -3),
        },
      });
    }

    /* ---------- نمایشگاه ---------- */
    const showcaseSeeds = [
      {
        missionIndex: 0,
        title: "اولین صفحهٔ من",
        description: "اولین صفحهٔ HTML که با اسم خودم ساختم؛ شروع مسیر بود.",
        pinned: true,
      },
      {
        missionIndex: 4,
        title: "کارت پروفایل رنگی",
        description: "با CSS یک کارت گرد و تمیز ساختم و روی هاور هم جلوه گذاشتم.",
        pinned: false,
      },
      {
        missionIndex: 6,
        title: "جدول برنامهٔ هفتگی",
        description: "برنامهٔ هفته‌ام را جدول کردم؛ حالا هر روز می‌دانم چه کاری دارم.",
        pinned: false,
      },
    ];
    for (const s of showcaseSeeds) {
      const ms = await db.missionSubmission.findFirst({
        where: {
          username: studentUsername,
          status: "approved",
          isTest: true,
          field: "computer",
          idx: s.missionIndex,
        },
        orderBy: { createdAt: "asc" },
      });
      if (!ms) continue;
      await db.showcaseItem.upsert({
        where: {
          username_sourceType_sourceId: {
            username: studentUsername,
            sourceType: "mission",
            sourceId: ms.id,
          },
        },
        update: { title: s.title, description: s.description, pinned: s.pinned },
        create: {
          username: studentUsername,
          sourceType: "mission",
          sourceId: ms.id,
          title: s.title,
          description: s.description,
          pinned: s.pinned,
          isTest: true,
        },
      });
    }

    /* گزارش هفتگی با ورود والد ساخته می‌شود؛ داده‌اش از ماموریت‌ها آماده است */

    console.log("[seed:test] دادهٔ نمونه آماده است.");
    console.log("[seed:test] اجرای دوبارهٔ این دستور دادهٔ تکراری نمی‌سازد.");
    console.log("[seed:test] برای پاک کردن: npm run seed:test:remove");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("[seed:test] خطا:", e?.message || e);
  process.exit(1);
});
