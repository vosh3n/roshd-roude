import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, roleOf, jsonError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if ((await roleOf(user.username)) !== "admin")
    return jsonError("دسترسی مدیر نداری.", 403);

  const body = await req.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const grant = !!body.grant;
  if (!username) return jsonError("نام کاربری لازم است.");

  if (grant) {
    await db.adminAllow.upsert({
      where: { username },
      update: {},
      create: { username },
    });
  } else {
    await db.adminAllow.deleteMany({ where: { username } });
  }
  return Response.json({ ok: true, role: grant ? "admin" : "student" });
}
