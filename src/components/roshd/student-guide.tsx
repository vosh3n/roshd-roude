"use client";

/**
 * راهنمای سه‌مرحله‌ای دانش‌آموز تازه‌وارد — بار اول بعد از ثبت‌نام،
 * قبل از انتخاب رشته. وضعیت دیده‌شدن روی کاربر در دیتابیس ذخیره می‌شود.
 */

import { useEffect, useState } from "react";
import { useRoshd } from "@/store/roshd";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import Mascot from "./mascot";

const STEPS: {
  icon: string;
  title: string;
  text: string;
  mascot: string;
  mood: "happy" | "cheer" | "think";
}[] = [
  {
    icon: "🎯",
    title: "هر روز ۴ ماموریت کوتاه داری",
    text: "در داشبورد، چهار کارت ماموریت برای امروزت آماده است — هر کدام ۵ تا ۲۰ دقیقه. روی کارت بزن تا باز شود و ببینی چه کاری باید انجام بدهی.",
    mascot: "امروز فقط یک قدم کوچک لازم است؛ بقیه‌اش خودش می‌آید.",
    mood: "happy",
  },
  {
    icon: "📤",
    title: "کارت را ارسال کن، معلم بررسی می‌کند",
    text: "کارت را با عکس، فایل، لینک یا توضیح بفرست. وضعیتش «در انتظار بررسی» می‌شود؛ بعد «تایید شده» یا «نیاز به اصلاح». اگر نیاز به اصلاح بود، فقط تغییرش بده و دوباره بفرست.",
    mascot: "فرستادن مهم‌ترین قدم است؛ کامل بودن را بعد با هم بهتر می‌کنیم.",
    mood: "think",
  },
  {
    icon: "🏅",
    title: "کارهای تاییدشده به نمایشگاه می‌روند",
    text: "هر کار تاییدشده می‌تواند در «نمایشگاه کارهای من» قاب بگیرد و نشان بگیری. بهترین‌هایت را سنجاق کن تا همیشه اول دیده شوند.",
    mascot: "نمایشگاه مال کارهای توست؛ قاب اول را با اولین ماموریت بساز.",
    mood: "cheer",
  },
];

export default function StudentGuide() {
  const serverUser = useRoshd((s) => s.serverUser);
  const markGuideSeen = useRoshd((s) => s.markGuideSeen);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const open = serverUser?.role === "student" && serverUser.guideSeen === false;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowLeft") setStep((s) => Math.min(STEPS.length - 1, s + 1));
      if (e.key === "ArrowRight") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    await markGuideSeen();
    setBusy(false);
  };

  return (
    <div className="guide-overlay" role="dialog" aria-modal="true" aria-label="راهنمای شروع">
      <div className="guide-card">
        <div className="guide-top">
          <span className="guide-badge">
            <Sparkles size={14} /> راهنمای شروع
          </span>
          <button type="button" className="guide-skip" onClick={finish} disabled={busy}>
            رد کردن
          </button>
        </div>

        <div className="guide-emoji" aria-hidden="true">
          <img
            src={
              ["/emoji/1f3af.png", "/emoji/1f4e4.png", "/emoji/1f3c5.png"][step]
            }
            alt=""
          />
        </div>

        <h2 className="guide-title">{current.title}</h2>
        <p className="guide-text">{current.text}</p>

        <Mascot text={current.mascot} mood={current.mood} size={56} name={false} />

        <div className="guide-dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? "on" : ""} />
          ))}
        </div>

        <div className="guide-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowRight size={16} /> قبلی
          </button>
          {isLast ? (
            <button type="button" className="btn" onClick={finish} disabled={busy}>
              <Check size={16} /> شروع کن!
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            >
              بعدی <ArrowLeft size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
