import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, isSuperAdmin, jsonError, errDetail } from "@/lib/auth";
import { deleteGalleryFile, saveGalleryImageAsync } from "@/lib/gallery";
import { cleanText } from "@/lib/sanitize";

/**
 * POST   /api/admin/gallery/{id}/photos — آپلود چند عکس هم‌زمان (files[])
 * DELETE /api/admin/gallery/{id}/photos?photo=<photoId> — حذف یک عکس
 * PATCH  /api/admin/gallery/{id}/photos — تغییر ترتیب عکس‌ها { order: [photoId] }
 * دسترسی: فقط مدیر سایت
 */

async function guard() {
  const user = await currentUser();
  if (!user) return { error: jsonError("وارد حساب نشده‌ای.", 401) };
  if (!isSuperAdmin(user.role))
    return { error: jsonError("دسترسی مدیر سایت لازم است.", 403) };
  return { user };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g.error) return g.error;

  const { id } = await params;
  const album = await db.galleryAlbum.findUnique({ where: { id } });
  if (!album) return jsonError("آلبوم پیدا نشد.", 404);

  const saved: string[] = [];
  try {
    const form = await req.formData();
    const files = form
      .getAll("files")
      .filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return jsonError("حداقل یک عکس انتخاب کن.", 400);
    if (files.length > 20)
      return jsonError("در هر بار حداکثر ۲۰ عکس آپلود کن.", 413);

    const maxSort = await db.galleryPhoto.aggregate({
      where: { albumId: id },
      _max: { sort: true },
    });
    let sort = (maxSort._max.sort ?? -1) + 1;
    let cover = album.cover;

    for (const f of files) {
      const name = await saveGalleryImageAsync(f);
      saved.push(name);
      await db.galleryPhoto.create({
        data: { albumId: id, file: name, sort: sort++ },
      });
      if (!cover) cover = name; // اولین عکس، کاور پیش‌فرض آلبوم
    }
    if (cover !== album.cover) {
      await db.galleryAlbum.update({ where: { id }, data: { cover } });
    }

    return Response.json({ ok: true, added: saved.length });
  } catch (e) {
    saved.forEach((n) => deleteGalleryFile(n));
    console.error("[admin/gallery/photos] POST:", errDetail(e));
    return jsonError(
      e instanceof Error ? e.message : "آپلود عکس انجام نشد.",
      400
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g.error) return g.error;

  const { id } = await params;
  const photoId = cleanText(req.nextUrl.searchParams.get("photo"), 80);
  if (!photoId) return jsonError("شناسهٔ عکس لازم است.", 400);

  const photo = await db.galleryPhoto.findUnique({ where: { id: photoId } });
  if (!photo || photo.albumId !== id)
    return jsonError("عکس پیدا نشد.", 404);

  await db.galleryPhoto.delete({ where: { id: photoId } });
  deleteGalleryFile(photo.file);

  // اگر کاور همان عکس بود، کاور بعدی جایگزین شود
  const album = await db.galleryAlbum.findUnique({ where: { id } });
  if (album && album.cover === photo.file) {
    const next = await db.galleryPhoto.findFirst({
      where: { albumId: id },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    });
    await db.galleryAlbum.update({
      where: { id },
      data: { cover: next?.file || "" },
    });
  }

  return Response.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g.error) return g.error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const order: string[] = Array.isArray(body.order)
    ? body.order.map((x: unknown) => String(x)).slice(0, 500)
    : [];
  if (!order.length) return jsonError("ترتیب جدید عکس‌ها لازم است.", 400);

  const photos = await db.galleryPhoto.findMany({ where: { albumId: id } });
  const allowed = new Set(photos.map((p) => p.id));

  let sort = 0;
  for (const pid of order) {
    if (!allowed.has(pid)) continue;
    await db.galleryPhoto.update({ where: { id: pid }, data: { sort: sort++ } });
  }
  return Response.json({ ok: true });
}
