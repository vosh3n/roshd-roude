import { db } from "@/lib/db";
import { currentUser, jsonError, AVATAR_DIR } from "@/lib/auth";
import fs from "fs";
import path from "path";

/** GET /api/avatar/{username} — ارسال عکس پروفایل (فقط کاربران واردشده) */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const viewer = await currentUser();
  if (!viewer) return jsonError("وارد حساب نشده‌ای.", 401);

  const { username } = await params;
  const u = await db.user.findUnique({
    where: { username },
    select: { avatar: true, avatarType: true },
  });
  if (!u?.avatar) return new Response(null, { status: 404 });

  const filePath = path.join(AVATAR_DIR, u.avatar);
  if (!filePath.startsWith(AVATAR_DIR) || !fs.existsSync(filePath))
    return new Response(null, { status: 404 });

  const buf = fs.readFileSync(filePath);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": u.avatarType || "image/jpeg",
      "Content-Length": String(buf.length),
      "Cache-Control": "private, max-age=300",
    },
  });
}
