import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, roleOf, jsonError, UPLOAD_DIR } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if ((await roleOf(user.username)) !== "admin")
    return jsonError("دسترسی مدیر نداری.", 403);

  const { id } = await params;
  const v = await db.video.findUnique({ where: { id } });
  if (!v) return jsonError("ویدیو پیدا نشد.", 404);

  await db.video.delete({ where: { id } });
  try {
    fs.rmSync(path.join(UPLOAD_DIR, v.fileId), { force: true });
  } catch {}
  return Response.json({ ok: true });
}
