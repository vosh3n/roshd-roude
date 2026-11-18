import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, jsonError } from "@/lib/auth";
import { syncProgressFromMissions } from "@/lib/missions-server";

/** نشان‌های شناخته‌شده — از پذیرفتن مقدار دلخواه جلوگیری می‌کند */
const KNOWN_BADGES = new Set(["start", "streak3", "streak7", "c25", "c50"]);

/** سقف حجم JSON پیشرفت (۵۰۰ کیلوبایت) */
const MAX_COMPLETED_JSON = 500 * 1024;
/** سقف طول رشتهٔ رشته/سطح */
const MAX_KEY_LEN = 32;

/**
 * GET /api/progress — خواندن پیشرفت ذخیره‌شده روی سرور
 * (منبع اصلی داده است؛ مرورگر تازه/پاک‌شده هم پیشرفت را برمی‌گرداند)
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (user.role !== "student") return Response.json({ progress: null });

  const row = await db.progress.findUnique({
    where: { username: user.username },
  });
  if (!row) return Response.json({ progress: null });

  let completed: Record<string, boolean> = {};
  let badges: string[] = [];
  try {
    completed = JSON.parse(row.completedJson || "{}");
  } catch {}
  try {
    const parsed = JSON.parse(row.badgesJson || "[]");
    if (Array.isArray(parsed)) badges = parsed;
  } catch {}

  return Response.json({
    progress: {
      field: row.field,
      level: row.level,
      completed,
      badges,
      updatedAt: row.updatedAt,
    },
  });
}

/**
 * POST /api/progress — sync پیشرفت دانش‌آموز روی سرور
 * بدنه: { field, level, completed: Record<string,boolean>, badges: string[] }
 * فقط دانش‌آموز اجازهٔ نوشتن دارد (ادمین/والد → 403)
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (user.role !== "student")
    return jsonError("فقط حساب دانش‌آموزی اجازهٔ ثبت پیشرفت دارد.", 403);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("بدنهٔ درخواست معتبر نیست.", 400);
  }

  // نوع‌ها را سخت‌گیرانه چک کن — بدنهٔ خراب نباید پیشرفت قبلی را پاک کند
  if (
    typeof body.field !== "string" ||
    typeof body.level !== "string" ||
    !Array.isArray(body.badges) ||
    body.badges.some((b: unknown) => typeof b !== "string")
  )
    return jsonError("ساختار دادهٔ پیشرفت معتبر نیست.", 400);

  const field = body.field.slice(0, MAX_KEY_LEN);
  const level = body.level.slice(0, MAX_KEY_LEN);

  /* «انجام‌شده» فقط از ماموریت‌های تاییدشدهٔ معلم ساخته می‌شود؛
     نقشه‌ای که مرورگر می‌فرستد پذیرفته نمی‌شود تا آمار قابل دستکاری نباشد. */
  const completed = await syncProgressFromMissions(user.username);
  const badges = Array.from(
    new Set(
      (body.badges as string[])
        .filter((b) => KNOWN_BADGES.has(b))
        .slice(0, KNOWN_BADGES.size)
    )
  );

  let completedJson: string;
  let badgesJson: string;
  try {
    completedJson = JSON.stringify(completed);
    badgesJson = JSON.stringify(badges);
  } catch {
    return jsonError("دادهٔ پیشرفت قابل ذخیره نیست.", 400);
  }
  if (completedJson.length > MAX_COMPLETED_JSON)
    return jsonError("حجم دادهٔ پیشرفت بیش از حد مجاز است.", 413);

  await db.progress.upsert({
    where: { username: user.username },
    update: {
      completedJson,
      badgesJson,
      ...(field ? { field } : {}),
      ...(level ? { level } : {}),
    },
    create: { username: user.username, field, level, completedJson, badgesJson },
  });

  return Response.json({ ok: true, completed });
}
