import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPass, createSession, jsonError, errDetail } from "@/lib/auth";
import { ensureAdmin } from "@/lib/bootstrap";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  try {
    await ensureAdmin();
    const body = await req.json();
    const name = String(body.name || "").trim();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const email = String(body.email || "").trim().toLowerCase();
    const classId = String(body.classId || "").trim();

    if (!name || !username || !password)
      return jsonError("همه فیلدها را پر کن.");
    if (password.length < 4)
      return jsonError("رمز عبور باید حداقل ۴ کاراکتر باشد.");
    if (!/^[\w.\-]{3,32}$/.test(username))
      return jsonError("نام کاربری فقط حروف، عدد و _ باشد.");
    if (email && !EMAIL_RE.test(email))
      return jsonError("ایمیل معتبر نیست.");

    const exists = await db.user.findUnique({ where: { username } });
    if (exists) return jsonError("این نام کاربری قبلاً گرفته شده.", 409);
    if (email) {
      const emailTaken = await db.user.findFirst({ where: { email } });
      if (emailTaken)
        return jsonError("این ایمیل قبلاً برای حساب دیگری ثبت شده.", 409);
    }

    /* کلاس اختیاری هنگام ثبت‌نام — فقط از کلاس‌های فعال */
    let classIdToSet: string | null = null;
    if (classId) {
      const cls = await db.schoolClass.findFirst({
        where: { id: classId, active: true },
        select: { id: true },
      });
      if (!cls) return jsonError("کلاس انتخاب‌شده معتبر نیست.", 400);
      classIdToSet = cls.id;
    }

    const { salt, hash } = hashPass(password);
    await db.user.create({
      data: {
        username,
        name,
        email: email || null,
        salt,
        hash,
        classId: classIdToSet,
      },
    });

    const sid = await createSession(username);
    if (!sid) return jsonError("خطای ساخت نشست.", 500);

    // ثبت‌نام عمومی همیشه فقط «دانش‌آموز» می‌سازد؛ هیچ نقش دیگری از این راه ساخته نمی‌شود
    const res = Response.json({
      user: {
        username,
        name,
        email: email || "",
        role: "student",
        avatar: "",
        guideSeen: false,
        classId: classIdToSet || "",
        reportUnread: 0,
      },
    });
    res.headers.append(
      "Set-Cookie",
      `sid=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`
    );
    return res;
  } catch (e) {
    console.error("[auth/register] 500:", e);
    return jsonError(`خطای سرور — ${errDetail(e)}`, 500);
  }
}
