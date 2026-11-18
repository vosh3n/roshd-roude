"use client";

import { ReactNode } from "react";

/** حالت خالی دلپذیر — به‌جای صفحهٔ خالی، یک پیام کوتاه و مهربان */
export default function EmptyState({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="calm-empty">
      <div className="calm-empty-art" aria-hidden="true">
        {icon || (
          <svg width="86" height="70" viewBox="0 0 120 96" role="presentation">
            <rect
              x="12"
              y="16"
              width="96"
              height="64"
              rx="16"
              fill="var(--field-soft, rgba(120,160,255,.16))"
            />
            <circle cx="42" cy="44" r="4.5" fill="var(--field-1, #6aa9ff)" />
            <circle cx="62" cy="44" r="4.5" fill="var(--field-1, #6aa9ff)" />
            <path
              d="M44 58 q 10 8 20 0"
              stroke="var(--field-1, #6aa9ff)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M84 10 l 6 10 -10 4"
              stroke="var(--field-2, #9be7c4)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        )}
      </div>
      <b>{title}</b>
      {hint ? <p>{hint}</p> : null}
      {children}
    </div>
  );
}
