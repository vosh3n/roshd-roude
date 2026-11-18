"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface LightPhoto {
  id: string;
  url: string;
  caption?: string;
}

/** نمایش بزرگ عکس با دکمهٔ قبلی/بعدی و بستن (Escape، فلش‌ها) */
export default function Lightbox({
  photos,
  index,
  title,
  onClose,
  onIndex,
}: {
  photos: LightPhoto[];
  index: number;
  title?: string;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const photo = photos[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndex((index + 1) % photos.length);
      if (e.key === "ArrowRight")
        onIndex((index - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, photos.length, onClose, onIndex]);

  if (!photo) return null;

  return (
    <div
      className="lightbox-bg"
      role="dialog"
      aria-modal="true"
      aria-label={title || "نمایش عکس"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className="lightbox-close"
        aria-label="بستن"
        onClick={onClose}
      >
        <X size={20} />
      </button>

      <button
        type="button"
        className="lightbox-nav prev"
        aria-label="عکس قبلی"
        onClick={() => onIndex((index - 1 + photos.length) % photos.length)}
      >
        <ChevronRight size={22} />
      </button>

      <figure className="lightbox-figure">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={photo.caption || title || "عکس گالری"} />
        <figcaption>
          {photo.caption || title || ""}
          <span className="lightbox-count">
            {(index + 1).toLocaleString("fa-IR")} از{" "}
            {photos.length.toLocaleString("fa-IR")}
          </span>
        </figcaption>
      </figure>

      <button
        type="button"
        className="lightbox-nav next"
        aria-label="عکس بعدی"
        onClick={() => onIndex((index + 1) % photos.length)}
      >
        <ChevronLeft size={22} />
      </button>
    </div>
  );
}
