import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { currentUser, isSuperAdmin, jsonError, errDetail } from "@/lib/auth";
import { deleteGalleryFile, saveGalleryImageAsync } from "@/lib/gallery";
import { cleanMultiline, cleanText } from "@/lib/sanitize";

/**
 * PATCH /api/admin/gallery/{id} — ویرایش عنوان/توضیح/کاور (multipart یا JSON)
 * DELETE /api/admin/gallery/{id} — حذف آلبوم همراه با عکس‌هایش
 * دسترسی: فقط مدیر سایت
 */

async function guard() {
  const user = await currentUser();
  if (!user) return { error: jsonError("وارد حساب نشده‌ای.", 401) };
  if (!isSuperAdmin(user.role))
    return { error: jsonError("دسترسی مدیر سایت لازم است.", 403) };
  return { user };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g.error) return g.error;

  const { id } = await params;
  const album = await db.galleryAlbum.findUnique({ where: { id } });
  if (!album) return jsonError("آلبوم پیدا نشد.", 404);

  try {
    const ct = req.headers.get("content-type") || "";
    let title = album.title;
    let description = album.description;
    let cover = album.cover;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      if (form.has("title")) title = cleanText(form.get("title"), 120);
      if (form.has("description"))
        description = cleanMultiline(form.get("description"), 600);
      const coverFile = form.get("cover");
      if (coverFile instanceof File && coverFile.size > 0) {
        const name = await saveGalleryImageAsync(coverFile);
        deleteGalleryFile(album.cover);
        cover = name;
      }
      if (form.get("removeCover") === "1") {
        deleteGalleryFile(album.cover);
        cover = "";
      }
    } else {
      const body = await req.json().catch(() => ({}));
      if (typeof body.title === "string") title = cleanText(body.title, 120);
      if (typeof body.description === "string")
        description = cleanMultiline(body.description, 600);
      if (body.removeCover === true) {
        deleteGalleryFile(album.cover);
        cover = "";
      }
    }

    if (title.length < 2) return jsonError("عنوان آلبوم را بنویس.", 400);

    await db.galleryAlbum.update({
      where: { id },
      data: { title, description, cover },
    });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[admin/gallery/{id}] PATCH:", errDetail(e));
    return jsonError(
      e instanceof Error ? e.message : "ویرایش آلبوم انجام نشد.",
      400
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const g = await guard();
  if (g.error) return g.error;

  const { id } = await params;
  const album = await db.galleryAlbum.findUnique({
    where: { id },
    include: { photos: true },
  });
  if (!album) return jsonError("آلبوم پیدا نشد.", 404);

  try {
    await db.galleryAlbum.delete({ where: { id } });
    deleteGalleryFile(album.cover);
    album.photos.forEach((p) => deleteGalleryFile(p.file));
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[admin/gallery/{id}] DELETE:", errDetail(e));
    return jsonError("حذف آلبوم انجام نشد.", 500);
  }
}
