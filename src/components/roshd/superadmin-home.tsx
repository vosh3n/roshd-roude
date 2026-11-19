"use client";

/**
 * صفحهٔ خانهٔ مدیر سایت — سه کارت بزرگ و وسط‌چین:
 *   ۱) پنل اولیا (گالری، اطلاعیه‌ها، تقویم و اتصال اولیا)
 *   ۲) پنل معلم (ارسال‌ها، تکالیف، ویدیوها، اطلاعیه‌ها و صندوق پیام‌ها)
 *   ۳) دانش‌آموزان (دیدن و مدیریت حساب‌ها و وضعیت دانش‌آموزان)
 * مسیرهای دانش‌آموز (آزمون تعیین سطح، انتخاب رشته/سطح، داشبورد، تکالیف،
 * ویدیوها و رتبه‌بندی) از این پنل کاملاً حذف شده‌اند.
 */

import { useRoshd, type Screen } from "@/store/roshd";
import { Settings } from "lucide-react";

const CARDS: {
  target: Screen;
  emoji: string;
  title: string;
  desc: string;
  items: string[];
}[] = [
  {
    target: "admin",
    emoji: "🏠",
    title: "پنل اولیا",
    desc: "هرچه اولیا می‌بینند، از همین‌جا مدیریت کن.",
    items: ["گالری مدرسه", "اطلاعیه‌ها", "تقویم", "اتصال اولیا"],
  },
  {
    target: "teacher",
    emoji: "🧑‍🏫",
    title: "پنل معلم",
    desc: "دسترسی کامل به کارهای معلم، بدون هیچ محدودیتی.",
    items: ["ارسال‌ها و ماموریت‌ها", "تکالیف", "ویدیوها", "صندوق پیام‌ها"],
  },
  {
    target: "students",
    emoji: "🎓",
    title: "دانش‌آموزان",
    desc: "حساب‌ها و وضعیت درسی دانش‌آموزان را ببین و مدیریت کن.",
    items: ["فهرست و وضعیت", "والد هر دانش‌آموز", "بازنشانی رمز", "حذف حساب"],
  },
];

export default function SuperAdminHome() {
  const setScreen = useRoshd((s) => s.setScreen);
  const serverUser = useRoshd((s) => s.serverUser);

  return (
    <div className="sa-home" dir="rtl">
      <header className="sa-head">
        <span className="sa-welcome">سلام {serverUser?.name || "مدیر سایت"} 👋</span>
        <h1 className="sa-title">از کجا شروع می‌کنی؟</h1>
        <p className="sa-sub">
          سه بخش اصلی پنل مدیر سایت. هرکدام را باز کنی، همهٔ کارهای همان بخش را
          می‌توانی انجام بدهی.
        </p>
      </header>

      <div className="sa-cards">
        {CARDS.map((c) => (
          <button
            key={c.target}
            type="button"
            className="sa-card"
            onClick={() => setScreen(c.target)}
          >
            <span className="sa-emoji" aria-hidden="true">
              <img src={"/emoji/" + emojiFile(c.emoji)} alt="" />
            </span>
            <b className="sa-card-title">{c.title}</b>
            <p className="sa-card-desc">{c.desc}</p>
            <ul className="sa-card-list">
              {c.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <span className="sa-card-go">ورود به بخش ←</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="sa-settings"
        onClick={() => setScreen("settings")}
      >
        <Settings size={16} /> تنظیمات (پوسته‌ها و تغییر رمز)
      </button>
    </div>
  );
}

/** نگاشت ایموجی به فایل موجود در public/emoji */
function emojiFile(emoji: string) {
  switch (emoji) {
    case "🏠":
      return "1f3e0.png";
    case "🧑‍🏫":
      return "1f4cb.png";
    case "🎓":
      return "1f393.png";
    default:
      return "2728.png";
  }
}
