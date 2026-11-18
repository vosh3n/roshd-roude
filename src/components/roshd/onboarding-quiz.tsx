"use client";

/**
 * پرسش‌نامهٔ اولین ورود — قبل از هر چیز از کاربر دو سوال کوتاه می‌پرسیم:
 * ۱) کدام پوسته را می‌پسندد؟  ۲) اندازهٔ متن چقدر باشد؟
 * انتخاب‌ها «همان لحظه» روی کل سایت اعمال می‌شوند (ThemeApplier زنده است)
 * و فقط یک‌بار برای هر مرورگر نمایش داده می‌شود (فلگ localStorage).
 */

import { useEffect, useRef, useState } from "react";
import { useRoshd } from "@/store/roshd";
import { getTheme, FONT_SCALES, FontScale } from "@/lib/themes";
import { Palette, Ruler, Sprout } from "lucide-react";

/* زیرمجموعه‌ای معرف از هر دستهٔ پوسته — بقیهٔ ۱۷ پوسته در تنظیمات منتظرند */
const QUIZ_THEMES: { id: string; label: string }[] = [
  { id: "roshd-dark", label: "مسیر رشد تاریک" },
  { id: "roshd-light", label: "مسیر رشد روشن" },
  { id: "material-you", label: "گوگل Material" },
  { id: "apple-ios", label: "اپل iOS" },
  { id: "apple-dark", label: "اپل تاریک" },
  { id: "win98", label: "ویندوز ۹۸" },
  { id: "pixel", label: "پیکسلی ۸-بیتی" },
  { id: "terminal", label: "ترمینال CRT" },
];

const TOTAL_STEPS = 3; // خوش‌آمد → پوسته → اندازه

export default function OnboardingQuiz() {
  const hydrated = useRoshd((s) => s.hydrated);
  const onboardingDone = useRoshd((s) => s.onboardingDone);
  const completeOnboarding = useRoshd((s) => s.completeOnboarding);
  const settings = useRoshd((s) => s.settings);
  const setTheme = useRoshd((s) => s.setTheme);
  const setFontScale = useRoshd((s) => s.setFontScale);
  const pushToast = useRoshd((s) => s.pushToast);

  const [step, setStep] = useState(0);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const open = hydrated && !onboardingDone;

  const finish = (greet: boolean) => {
    completeOnboarding();
    if (greet)
      pushToast("خوش آمدی! هر وقت خواستی از تنظیمات عوضشان کن");
  };

  /* قفل اسکرول بدنه + Esc برای رد کردن + فوکوس روی دکمهٔ اصلی هر مرحله */
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => primaryRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, step]);

  if (!open) return null;

  const isLast = step === TOTAL_STEPS - 1;

  return (
    <div className="ob-overlay" role="dialog" aria-modal="true" aria-label="پرسش‌نامه اولین ورود">
      <div className="ob-card">
        {/* نوار پیشرفت */}
        <div className="ob-dots" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span key={i} className={"ob-dot" + (i === step ? " on" : "")} />
          ))}
        </div>

        <div className="ob-step" key={step}>
          {step === 0 ? (
            <>
              <span className="ob-emoji">
                <Sprout size={34} />
              </span>
              <h2 className="ob-title">به «مسیر رشد» خوش اومدی!</h2>
              <p className="ob-sub">
                قبل از شروع، دو تا سوال کوتاه داریم تا سایت رو دقیقاً به
                سلیقهٔ خودت تنظیم کنیم. هر وقت خواستی از تنظیمات عوضشون می‌کنی.
              </p>
              <button
                ref={primaryRef}
                className="btn ob-primary"
                type="button"
                onClick={() => setStep(1)}
              >
                بزن بریم
              </button>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <h2 className="ob-title">
                <Palette size={18} />
                کدوم حال‌وهوا را بیشتر می‌پسندی؟
              </h2>
              <p className="ob-sub">
                با کلیک روی هر گزینه، پوسته همین حالا اعمال می‌شه — نتیجه رو پشت
                همین پنجره ببین! بقیهٔ ۱۷ پوسته بعداً توی تنظیمات هستن.
              </p>
              <div className="ob-themes" role="radiogroup" aria-label="انتخاب پوسته">
                {QUIZ_THEMES.map((q) => {
                  const t = getTheme(q.id);
                  const selected = settings.theme === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={"ob-theme" + (selected ? " selected" : "")}
                      onClick={() => setTheme(q.id)}
                    >
                      <span className="ob-swatch" style={{ background: t.preview.bg }}>
                        <i style={{ background: t.preview.card }} />
                        <i style={{ background: t.preview.accent }} />
                        <i style={{ background: t.preview.accent2 }} />
                      </span>
                      <span className="ob-tname" />
                      <span className="ob-tlabel">{q.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h2 className="ob-title">
                <Ruler size={18} />
                اندازهٔ متن چقدر باشد؟
              </h2>
              <p className="ob-sub">
                برای چشم‌های راحت. انتخابت همون لحظه روی کل سایت اعمال می‌شه.
              </p>
              <div className="ob-sizes" role="radiogroup" aria-label="اندازه متن">
                {FONT_SCALES.map((fs) => {
                  const selected = settings.fontScale === fs.id;
                  const scale =
                    fs.id === "compact"
                      ? 0.9
                      : fs.id === "normal"
                        ? 1
                        : fs.id === "large"
                          ? 1.12
                          : 1.25;
                  return (
                    <button
                      key={fs.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={"ob-size" + (selected ? " selected" : "")}
                      onClick={() => setFontScale(fs.id as FontScale)}
                    >
                      <span
                        className="ob-sample"
                        style={{ fontSize: scale + "rem" }}
                        aria-hidden="true"
                      >
                        الف
                      </span>
                      <span className="ob-slabel">{fs.label}</span>
                      <span className="ob-shint">{fs.hint}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        {/* اکشن‌ها: رد کردن (سمت آغاز RTL) + قبلی/بعدی — در مرحلهٔ خوش‌آمد
            دکمهٔ قهرمانِ وسط کار را می‌کند؛ «بعدی» اضافه است و حذف می‌شود
            (دو CTA هم‌ارزش در یک نما = شلوغی، بازخورد بازبینی بصری) */}
        <div className="ob-actions">
          <button className="ob-skip" type="button" onClick={() => finish(false)}>
            رد کردن
          </button>
          <div className="ob-nav">
            {step > 0 ? (
              <button
                className="btn secondary"
                type="button"
                onClick={() => setStep(step - 1)}
              >
                قبلی
              </button>
            ) : null}
            {step > 0 ? (
              <button
                ref={primaryRef}
                className="btn"
                type="button"
                onClick={() => {
                  if (isLast) finish(true);
                  else setStep(step + 1);
                }}
              >
                {isLast ? "تمام! شروع کنیم" : "بعدی"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
