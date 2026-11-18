import { db } from "@/lib/db";
import { currentUser, roleOf, jsonError } from "@/lib/auth";

export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if ((await roleOf(user.username)) !== "admin")
    return jsonError("دسترسی مدیر نداری.", 403);

  const allows = await db.adminAllow.findMany({ orderBy: { username: "asc" } });
  const users = await db.user.findMany();
  const known = new Set(users.map((u) => u.username));
  const nameOf = new Map(users.map((u) => [u.username, u.name]));

  return Response.json({
    usernames: allows.map((a) => ({
      username: a.username,
      name: nameOf.get(a.username) || "",
      joined: known.has(a.username),
    })),
  });
}
