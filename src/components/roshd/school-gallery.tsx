"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/store/roshd";
import { toFa } from "@/lib/jalali";
import { ArrowRight, Images, Loader2 } from "lucide-react";
import EmptyState from "./empty-state";
import Lightbox from "./lightbox";

export interface GalleryPhotoDTO {
  id: string;
  url: string;
  caption: string;
}

export interface GalleryAlbumDTO {
  id: string;
  title: string;
  description: string;
  cover: string;
  count: number;
  photos: GalleryPhotoDTO[];
}

/**
 * گالری مدرسه (فقط مشاهده) — آلبوم‌های کارتی، شبکهٔ عکس‌ها و نمایش بزرگ.
 * همان نمای اولیا در پنل مدیر سایت هم به‌عنوان پیش‌نمایش استفاده می‌شود.
 */
export default function SchoolGallery({
  refreshKey = 0,
  emptyHint = "به‌زودی عکس‌های کلاس و اردوها همین‌جا گذاشته می‌شود.",
}: {
  refreshKey?: number;
  emptyHint?: string;
}) {
  const [albums, setAlbums] = useState<GalleryAlbumDTO[] | null>(null);
  const [error, setError] = useState("");
  const [openAlbum, setOpenAlbum] = useState<string | null>(null);
  const [light, setLight] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api("/api/gallery");
      setAlbums(d.albums || []);
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setAlbums([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const album = albums?.find((a) => a.id === openAlbum) || null;

  if (albums === null)
    return (
      <div className="calm-loading">
        <Loader2 size={18} className="spin" /> در حال خواندن گالری…
      </div>
    );

  if (error)
    return (
      <div className="calm-empty">
        <b>گالری باز نشد</b>
        <p>{error}</p>
        <button type="button" className="btn secondary" onClick={load}>
          تلاش دوباره
        </button>
      </div>
    );

  if (album) {
    return (
      <div className="gallery-album">
        <div className="gallery-album-head">
          <button
            type="button"
            className="btn secondary gallery-back"
            onClick={() => {
              setOpenAlbum(null);
              setLight(null);
            }}
          >
            <ArrowRight size={16} /> همهٔ آلبوم‌ها
          </button>
          <div>
            <h3 className="gallery-title">{album.title}</h3>
            {album.description ? (
              <p className="gallery-sub">{album.description}</p>
            ) : null}
          </div>
          <span className="gallery-count">
            {toFa(album.photos.length)} عکس
          </span>
        </div>

        {album.photos.length === 0 ? (
          <EmptyState
            title="این آلبوم هنوز عکسی ندارد"
            hint="به‌محض اضافه‌شدن عکس، همین‌جا می‌بینی."
          />
        ) : (
          <div className="photo-grid">
            {album.photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className="photo-tile"
                onClick={() => setLight(i)}
                aria-label={p.caption || `عکس ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption || album.title} loading="lazy" />
              </button>
            ))}
          </div>
        )}

        {light !== null ? (
          <Lightbox
            photos={album.photos}
            index={light}
            title={album.title}
            onClose={() => setLight(null)}
            onIndex={setLight}
          />
        ) : null}
      </div>
    );
  }

  if (!albums.length)
    return (
      <EmptyState
        title="گالری هنوز خالی است"
        hint={emptyHint}
        icon={<Images size={26} />}
      />
    );

  return (
    <div className="album-grid">
      {albums.map((a) => (
        <button
          key={a.id}
          type="button"
          className="album-card"
          onClick={() => setOpenAlbum(a.id)}
        >
          <span className="album-cover">
            {a.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.cover} alt="" loading="lazy" />
            ) : (
              <Images size={26} />
            )}
          </span>
          <span className="album-body">
            <b>{a.title}</b>
            {a.description ? <small>{a.description}</small> : null}
            <span className="album-meta">
              {toFa(a.count)} عکس
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
