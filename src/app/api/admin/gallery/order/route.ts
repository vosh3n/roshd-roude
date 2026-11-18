import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, isSuperAdmin, jsonError } from "@/lib/auth";

/**
 * POST /api/admin/gallery/order — تغییر ترتیب آلبوم‌ها { ids: [albumId] }
 * دسترسی: فقط مدیر سایت
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (!isSuperAdmin(user.role)) return jsonError("دسترسی مدیر سایت لازم است.", 403);

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids)
    ? body.ids.map((x: unknown) => String(x)).slice(0, 200)
    : [];
  if (!ids.length) return jsonError("ترتیب جدید لازم است.", 400);

  const albums = await db.galleryAlbum.findMany({ select: { id: true } });
  const allowed = new Set(albums.map((a) => a.id));

  let sort = 0;
  for (const id of ids) {
    if (!allowed.has(id)) continue;
    await db.galleryAlbum.update({ where: { id }, data: { sort: sort++ } });
  }
  return Response.json({ ok: true });
}
