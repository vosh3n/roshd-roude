"use client";

/**
 * صفحه تنظیمات — گالری ۱۷ پوسته با پیش‌نمایش زنده + تنظیمات نمایش
 */

import { useEffect, useMemo, useState } from "react";
import { api, useRoshd } from "@/store/roshd";
import {
  THEMES,
  THEME_CATEGORIES,
  FONT_SCALES,
  ThemeCategory,
  ThemeDef,
} from "@/lib/themes";
import { Switch } from "@/components/ui/switch";
import {
  Check,
  Flame,
  Info,
  Mail,
  Palette,
  Settings as SettingsIcon,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import UserAvatar from "./user-avatar";
import PasswordCard from "./password-card";
import { ROLE_LABEL } from "@/lib/role-labels";

/* ---------- کارت پیش‌نمایش یک تم ---------- */

function ThemePreview({ theme }: { theme: ThemeDef }) {
  const p = theme.preview;
  return (
    <div
      className="theme-preview"
      aria-hidden="true"
      style={
        {
          background: p.bg,
          "--tp-accent": p.accent,
          "--tp-line": p.line,
          "--tp-text": p.text,
          "--tp-muted": p.muted,
          "--tp-card": p.card,
          "--tp-track": p.track,
          "--tp-btn-bg": p.btnBg,
          "--tp-btn-text": p.btnText,
          "--tp-accent-soft": p.accentSoft,
          "--tp-accent-soft-text": p.accentSoftText,
        } as React.CSSProperties
      }
    >
      <div className="tp-header">
        <div className="tp-logo" style={{ color: p.text }}>
          مسیر <span>رشد</span>
        </div>
        <span className="tp-btn">شروع</span>
      </div>
      <div className="tp-stats">
        <div className="tp-stat">
          <b>۲</b>
          <span>از ۴ ماموریت</span>
          <div className="tp-bar">
            <i />
          </div>
        </div>
        <div className="tp-stat">
          <b style={{ color: p.accent }}>
            <Flame size={13} style={{ verticalAlign: "-2px" }} /> ۳
          </b>
          <span>روز متوالی</span>
        </div>
      </div>
      <div className="tp-chips">
        <span className="tp-chip">امروز</span>
        <span
          className="tp-chip"
          style={{ background: "transparent", border: "1px solid " + p.line, color: p.muted }}
        >
          هفته
        </span>
      </div>
    </div>
  );
}

/* ---------- صفحه اصلی تنظیمات ---------- */

const FILTERS: { id: ThemeCategory | "all"; label: string }[] = [
  { id: "all", label: "همه پوسته‌ها" },
  { id: "design", label: "زبان‌های طراحی" },
  { id: "github", label: "پالت‌های گیت‌هاب" },
  { id: "retro", label: "نوستالژی و خاص" },
  { id: "default", label: "مسیر رشد" },
];

export default function SettingsScreen() {
  const settings = useRoshd((s) => s.settings);
  const setTheme = useRoshd((s) => s.setTheme);
  const setFontScale = useRoshd((s) => s.setFontScale);
  const setReducedMotion = useRoshd((s) => s.setReducedMotion);
  const setSound = useRoshd((s) => s.setSound);
  const resetSettings = useRoshd((s) => s.resetSettings);
  const pushToast = useRoshd((s) => s.pushToast);
  const serverUser = useRoshd((s) => s.serverUser);
  const setAvatarModalOpen = useRoshd((s) => s.setAvatarModalOpen);
  const curUser = useRoshd((s) => s.curUser);
  const logout = useRoshd((s) => s.logout);
  const setScreen = useRoshd((s) => s.setScreen);
  const saveEmail = useRoshd((s) => s.saveEmail);
  const replayGuide = useRoshd((s) => s.replayGuide);

  const [filter, setFilter] = useState<ThemeCategory | "all">("all");
  const [emailInput, setEmailInput] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  /* قابلیت ایمیل فقط اگر SMTP در .env تنظیم شده باشد نمایش داده می‌شود */
  const [smtp, setSmtp] = useState(false);
  const [kids, setKids] = useState<{ username: string; name: string }[]>([]);
  const [kid, setKid] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const u = curUser();

  useEffect(() => {
    if (serverUser?.role !== "parent") return;
    api("/api/config/features")
      .then((d) => setSmtp(!!d.smtp))
      .catch(() => setSmtp(false));
    api("/api/parent/overview")
      .then((d) => {
        const list = d.students || [];
        setKids(list);
        setKid(list[0]?.username || "");
      })
      .catch(() => {});
  }, [serverUser?.role]);

  const sendReport = async () => {
    if (!kid) return;
    setReportBusy(true);
    try {
      await api("/api/parent/reports/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child: kid }),
      });
      pushToast("گزارش هفتگی به ایمیلت فرستاده شد.");
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setReportBusy(false);
    }
  };

  const filtered = useMemo(
    () => (filter === "all" ? THEMES : THEMES.filter((t) => t.category === filter)),
    [filter]
  );

  const activeTheme = THEMES.find((t) => t.id === settings.theme) || THEMES[0];

  const applyTheme = (t: ThemeDef) => {
    if (t.id === settings.theme) return;
    setTheme(t.id);
    pushToast("پوسته «" + t.name + "» فعال شد");
  };

  return (
    <>
      {/* سربرگ */}
      <div className="card settings-hero">
        <h1 className="hero-title" style={{ fontSize: "1.75rem" }}>
          <SettingsIcon size={24} />
          تنظیمات
        </h1>
        <p className="note" style={{ marginTop: 0 }}>
          ظاهر سایت را شخصی‌سازی کن — {THEMES.length} پوسته آماده است و همه‌جا
          (در همهٔ صفحه‌ها) اعمال می‌شود. تنظیمات روی همین مرورگر ذخیره
          می‌شود.
        </p>
        <div className="note" style={{ marginTop: "0.5rem" }}>
          پوسته فعال: <b style={{ color: "var(--accent)" }}>{activeTheme.name}</b>
        </div>
      </div>

      <div style={{ height: "1.25rem" }} />

      {/* بخش پوسته‌ها */}
      <div className="card settings-section">
        <h2 className="section-title">
          <Palette size={18} />
          پوسته و ظاهر
        </h2>
        <p className="settings-desc">
          {filter === "all"
            ? "از پوسته‌های پیش‌فرض تا زبان‌های طراحی گوگل و اپل، پالت‌های معروف گیت‌هاب و تم‌های نوستالژیک — روی هر کارت بزن تا فوراً اعمال شود."
            : THEME_CATEGORIES[filter].hint}
        </p>

        <div className="settings-nav" role="tablist" aria-label="دسته‌بندی پوسته‌ها">
          {FILTERS.map((f) => (
            <div
              key={f.id}
              className={"tabbtn" + (filter === f.id ? " active" : "")}
              role="tab"
              aria-selected={filter === f.id}
              tabIndex={0}
              onClick={() => setFilter(f.id)}
              onKeyDown={(e) => e.key === "Enter" && setFilter(f.id)}
            >
              {f.label}
            </div>
          ))}
        </div>

        <div className="theme-grid" id="themeGrid">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={"theme-card" + (settings.theme === t.id ? " selected" : "")}
              role="button"
              tabIndex={0}
              aria-pressed={settings.theme === t.id}
              aria-label={"اعمال پوسته " + t.name}
              onClick={() => applyTheme(t)}
              onKeyDown={(e) => e.key === "Enter" && applyTheme(t)}
            >
              {settings.theme === t.id ? (
                <div className="check-badge" aria-hidden="true">
                  <Check size={14} />
                </div>
              ) : null}
              <ThemePreview theme={t} />
              <div className="theme-meta">
                <b>
                  <span
                    className="theme-swatch"
                    style={{ background: t.preview.accent }}
                    aria-hidden="true"
                  />
                  {t.name}
                </b>
                <small>{t.source}</small>
                <div className="theme-tags">
                  <span className={"theme-tag " + (t.dark ? "dark" : "light")}>
                    {t.dark ? "تاریک" : "روشن"}
                  </span>
                  <span className="theme-tag">{THEME_CATEGORIES[t.category].label}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.find((t) => t.id === settings.theme) ? null : (
          <p className="note">
            پوسته فعال فعلی در این دسته نیست.
          </p>
        )}
      </div>

      {/* بخش نمایش */}
      <div className="card settings-section">
        <h2 className="section-title">
          <SlidersHorizontal size={18} />
          اندازه نمایش و حرکت
        </h2>
        <p className="settings-desc">
          اندازه متن و عناصر صفحه را تنظیم کن؛ برای چشمی راحت‌تر حالت بزرگ را
          امتحان کن.
        </p>

        <div className="setting-row">
          <div className="setting-label">
            اندازه نمایش
            <small>
              کل متن‌ها و فاصله‌ها متناسب با انتخاب شما بزرگ یا کوچک می‌شوند
            </small>
          </div>
          <div className="scale-options" role="radiogroup" aria-label="اندازه نمایش">
            {FONT_SCALES.map((f) => (
              <button
                key={f.id}
                className={"scale-opt" + (settings.fontScale === f.id ? " active" : "")}
                role="radio"
                aria-checked={settings.fontScale === f.id}
                onClick={() => setFontScale(f.id)}
              >
                {f.label} <small style={{ opacity: 0.7 }}>{f.hint}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-label">
            افکت‌های صوتی
            <small>صدای «تیک» هنگام انجام ماموریت‌ها (مثل نسخه اصلی)</small>
          </div>
          <Switch
            checked={settings.sound}
            onCheckedChange={(v) => setSound(v)}
            aria-label="افکت‌های صوتی"
          />
        </div>

        <div className="setting-row">
          <div className="setting-label">
            کاهش انیمیشن‌ها
            <small>
              برای چشم‌های حساس؛ حرکت‌ها و کانفتی ساده می‌شوند
            </small>
          </div>
          <Switch
            checked={settings.reducedMotion}
            onCheckedChange={(v) => setReducedMotion(v)}
            aria-label="کاهش انیمیشن‌ها"
          />
        </div>
      </div>

      {/* بخش حساب */}
      {serverUser ? (
        <div className="card settings-section">
          <h2 className="section-title">
            <UserRound size={18} />
            حساب کاربری
          </h2>
          <p className="settings-desc">
            اطلاعات حساب شما در «مسیر رشد»
          </p>
          <div className="setting-row">
            <div className="setting-label with-avatar">
              <UserAvatar
                src={serverUser.avatar}
                name={u?.name || serverUser.name}
              />
              {u?.name || serverUser.name}
              <small>
                نام کاربری: {serverUser.username} · نقش:{" "}
                {ROLE_LABEL[serverUser.role]}
              </small>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button className="btn secondary" onClick={() => setAvatarModalOpen(true)}>
                عکس پروفایل
              </button>
              {/* دکمهٔ داشبورد فقط برای دانش‌آموز معنا دارد؛ والد و معلم
                  صفحهٔ خانهٔ دیگری دارند */}
              {serverUser.role === "student" ? (
                <button className="btn" onClick={() => setScreen("dashboard")}>
                  داشبورد
                </button>
              ) : null}
              <button className="btn secondary" onClick={logout}>
                خروج از حساب
              </button>
            </div>
          </div>

          {/* ایمیل بازیابی رمز */}
          <div className="setting-row" style={{ alignItems: "flex-start" }}>
            <div className="setting-label">
              <Mail size={16} className="setting-icon" />
              ایمیل بازیابی رمز
              <small>
                اگر رمزت را فراموش کنی، کد بازیابی به این ایمیل فرستاده می‌شود.
                {serverUser.email
                  ? ` فعلاً ثبت‌شده: ${serverUser.email}`
                  : " هنوز ایمیل ثبت نکرده‌ای."}
              </small>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                type="email"
                dir="ltr"
                placeholder="you@example.com"
                aria-label="ایمیل بازیابی رمز"
                defaultValue={serverUser.email || ""}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{
                  minWidth: "13rem",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.625rem",
                  border: "1px solid var(--line)",
                  background: "var(--card)",
                  color: "var(--text)",
                  font: "inherit",
                  fontSize: "16px",
                }}
              />
              <button
                className="btn secondary"
                disabled={emailBusy}
                onClick={async () => {
                  setEmailBusy(true);
                  try {
                    await saveEmail(emailInput.trim());
                    pushToast("ایمیل بازیابی ذخیره شد.");
                  } catch (e: any) {
                    pushToast(String(e?.message || "ذخیرهٔ ایمیل ناموفق بود"));
                  } finally {
                    setEmailBusy(false);
                  }
                }}
              >
                {emailBusy ? "در حال ذخیره…" : "ذخیرهٔ ایمیل"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* راهنمای شروع — فقط دانش‌آموز */}
      {serverUser?.role === "student" ? (
        <div className="card settings-section">
          <h2 className="section-title">
            <UserRound size={18} />
            راهنمای شروع
          </h2>
          <p className="settings-desc">
            سه صفحهٔ کوتاه دربارهٔ ماموریت‌های روزانه، ارسال کار و نمایشگاه. هر وقت
            خواستی می‌توانی دوباره ببینی‌شان.
          </p>
          <button
            className="btn secondary"
            onClick={async () => {
              await replayGuide();
              pushToast("راهنما دوباره باز شد.");
            }}
          >
            دیدن دوبارهٔ راهنما
          </button>
        </div>
      ) : null}

      {/* ارسال گزارش هفتگی با ایمیل — فقط اگر SMTP تنظیم شده باشد */}
      {serverUser?.role === "parent" && smtp ? (
        <div className="card settings-section">
          <h2 className="section-title">
            <Mail size={18} />
            گزارش هفتگی با ایمیل
          </h2>
          <p className="settings-desc">
            گزارش هفتهٔ جاری فرزندت را به ایمیل ثبت‌شده در حسابت بفرست.
          </p>
          {kids.length ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <select
                value={kid}
                onChange={(e) => setKid(e.target.value)}
                aria-label="انتخاب فرزند برای ارسال گزارش"
              >
                {kids.map((k) => (
                  <option key={k.username} value={k.username}>
                    {k.name}
                  </option>
                ))}
              </select>
              <button className="btn secondary" onClick={sendReport} disabled={reportBusy}>
                {reportBusy ? "در حال ارسال…" : "ارسال گزارش به ایمیل"}
              </button>
            </div>
          ) : (
            <p className="note">هنوز فرزندی به حسابت وصل نشده است.</p>
          )}
        </div>
      ) : null}

      <PasswordCard />

      {/* درباره */}
      <div className="card settings-section">
        <h2 className="section-title">
          <Info size={18} />
          درباره پوسته‌ها
        </h2>
        <div className="about-box">
          پوسته‌های این بخش از پروژه‌های متن‌باز معروف الهام و با رنگ‌های رسمی
          آن‌ها ساخته شده‌اند: دراکولا، نورد، کت‌پوچین، گروباکس، توکیو نایت،
          سولاریزد، روزِ پایین، اورفورست و سینث‌ویو ۸۴ از گیت‌هاب؛ Material You
          از زبان طراحی گوگل؛ iOS از راهنمای رابط انسانی اپل؛ و دو پوسته
          «ویندوز ۹۸» و «پیکسلی» و «ترمینال CRT» برای حس نوستالژیک. رنگ‌ها،
          فونت‌ها، گردی گوشه‌ها و حتی سایه‌ها برای هر پوسته جداگانه طراحی شده
          تا تجربه‌ی کاملاً متفاوتی داشته باشی.
        </div>
        <div style={{ marginTop: "1rem" }}>
          <button
            className="btn secondary"
            onClick={() => {
              resetSettings();
              pushToast("تنظیمات به حالت پیش‌فرض برگشت.");
            }}
          >
            بازگردانی تنظیمات پیش‌فرض
          </button>
        </div>
      </div>
    </>
  );
}
