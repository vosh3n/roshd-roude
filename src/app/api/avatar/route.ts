import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  currentUser,
  jsonError,
  errDetail,
  AVATAR_DIR,
  AVATAR_TYPES,
  MAX_AVATAR_SIZE,
  avatarUrl,
} from "@/lib/auth";
import crypto from "crypto";
import path from "path";
import fs from "fs";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function removeFile(file: string | null | undefined) {
  if (!file) return;
  try {
    const p = path.join(AVATAR_DIR, file);
    if (p.startsWith(AVATAR_DIR) && fs.existsSync(p)) fs.unlinkSync(p);
  } catch {}
}

/** POST /api/avatar — آپلود عکس پروفایل کاربر جاری (multipart: avatar) */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("ابتدا وارد حساب کاربری شو.", 401);

  try {
    const form = await req.formData();
    const file = form.get("avatar") as File | null;
    if (!file || !file.size) return jsonError("یک عکس انتخاب کن.");
    if (!AVATAR_TYPES.includes(file.type))
      return jsonError("فقط عکس JPG، PNG، WebP یا GIF مجاز است.");
    if (file.size > MAX_AVATAR_SIZE)
      return jsonError("حجم عکس باید کمتر از ۳ مگابایت باشد.", 413);

    const old = await db.user.findUnique({
      where: { username: user.username },
      select: { avatar: true },
    });

    fs.mkdirSync(AVATAR_DIR, { recursive: true });
    const name =
      crypto.randomBytes(10).toString("hex") + "." + (EXT[file.type] || "jpg");
    fs.writeFileSync(
      path.join(AVATAR_DIR, name),
      Buffer.from(await file.arrayBuffer())
    );

    await db.user.update({
      where: { username: user.username },
      data: { avatar: name, avatarType: file.type },
    });
    // فایل قبلی بعد از موفقیت پاک می‌شود
    removeFile(old?.avatar);

    return Response.json({ ok: true, avatar: avatarUrl(user.username, name) });
  } catch (e) {
    console.error("[avatar] upload error:", errDetail(e));
    return jsonError("خطای سرور در ذخیرهٔ عکس.", 500);
  }
}

/** DELETE /api/avatar — حذف عکس پروفایل کاربر جاری */
export async function DELETE() {
  const user = await currentUser();
  if (!user) return jsonError("ابتدا وارد حساب کاربری شو.", 401);

  try {
    const old = await db.user.findUnique({
      where: { username: user.username },
      select: { avatar: true },
    });
    await db.user.update({
      where: { username: user.username },
      data: { avatar: "", avatarType: "" },
    });
    removeFile(old?.avatar);
    return Response.json({ ok: true, avatar: "" });
  } catch (e) {
    console.error("[avatar] delete error:", errDetail(e));
    return jsonError("خطای سرور در حذف عکس.", 500);
  }
}
