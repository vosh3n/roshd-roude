import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, isSuperAdmin, jsonError, errDetail } from "@/lib/auth";
import {
  assertGalleryFile,
  deleteGalleryFile,
  galleryUrl,
  saveGalleryImageAsync,
} from "@/lib/gallery";
import { cleanMultiline, cleanText } from "@/lib/sanitize";

/**
 * GET /api/admin/gallery — آلبوم‌ها با عکس‌ها برای مدیریت
 * POST /api/admin/gallery — ساخت آلبوم (multipart: title, description, cover?, files[])
 * دسترسی: فقط مدیر سایت
 */

export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (!isSuperAdmin(user.role)) return jsonError("دسترسی مدیر سایت لازم است.", 403);

  const albums = await db.galleryAlbum.findMany({
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    include: { photos: { orderBy: [{ sort: "asc" }, { createdAt: "asc" }] } },
  });

  return Response.json({
    albums: albums.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      cover: galleryUrl(a.cover || a.photos[0]?.file || ""),
      photos: a.photos.map((p) => ({
        id: p.id,
        url: galleryUrl(p.file),
        caption: p.caption,
      })),
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);
  if (!isSuperAdmin(user.role)) return jsonError("دسترسی مدیر سایت لازم است.", 403);

  const saved: string[] = [];
  let albumId = "";
  try {
    const form = await req.formData();
    const title = cleanText(form.get("title"), 120);
    const description = cleanMultiline(form.get("description"), 600);
    if (title.length < 2) return jsonError("عنوان آلبوم را بنویس.", 400);

    const coverFile = form.get("cover");
    const files = form
      .getAll("files")
      .filter((f): f is File => f instanceof File && f.size > 0);

    /* نوع و حجم همهٔ عکس‌ها قبل از ساخت آلبوم بررسی می‌شود تا
       آلبوم نیمه‌کاره ساخته نشود */
    if (coverFile instanceof File && coverFile.size > 0)
      assertGalleryFile(coverFile);
    files.forEach((f) => assertGalleryFile(f));

    let cover = "";
    if (coverFile instanceof File && coverFile.size > 0) {
      cover = await saveGalleryImageAsync(coverFile);
      saved.push(cover);
    }

    const maxSort = await db.galleryAlbum.aggregate({ _max: { sort: true } });
    const album = await db.galleryAlbum.create({
      data: {
        title,
        description,
        cover,
        sort: (maxSort._max.sort ?? 0) + 1,
      },
    });
    albumId = album.id;

    let idx = 0;
    for (const f of files) {
      const name = await saveGalleryImageAsync(f);
      saved.push(name);
      await db.galleryPhoto.create({
        data: { albumId: album.id, file: name, sort: idx++ },
      });
    }

    return Response.json({ ok: true, id: album.id });
  } catch (e) {
    // اگر ساخت آلبوم شکست خورد، هم آلبوم نیمه‌کاره و هم عکس‌هایش پاک شوند
    saved.forEach((n) => deleteGalleryFile(n));
    if (albumId) {
      try {
        await db.galleryAlbum.delete({ where: { id: albumId } });
      } catch {
        /* آلبوم ساخته نشده بود */
      }
    }
    console.error("[admin/gallery] POST:", errDetail(e));
    return jsonError(
      e instanceof Error ? e.message : "خطای سرور در ساخت آلبوم.",
      400
    );
  }
}
