import { db } from "@/lib/db";
import { currentUser, jsonError } from "@/lib/auth";
import { galleryUrl } from "@/lib/gallery";

/**
 * GET /api/gallery — آلبوم‌های گالری مدرسه با عکس‌ها (فقط مشاهده)
 * دسترسی: هر کاربر وارد‌شده (والد، معلم، مدیر سایت، دانش‌آموز)
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("وارد حساب نشده‌ای.", 401);

  const albums = await db.galleryAlbum.findMany({
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    include: { photos: { orderBy: [{ sort: "asc" }, { createdAt: "asc" }] } },
  });

  return Response.json({
    albums: albums.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      count: a.photos.length,
      cover: galleryUrl(a.cover || a.photos[0]?.file || ""),
      photos: a.photos.map((p) => ({
        id: p.id,
        url: galleryUrl(p.file),
        caption: p.caption,
      })),
    })),
  });
}
