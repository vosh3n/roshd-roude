"use client";

/**
 * پنل اولیا — پنج بخش، همه فقط-مشاهده به‌جز پیام به معلم:
 * گالری مدرسه · وضعیت فرزند · اطلاعیه‌ها · تقویم مدرسه · ارتباط با معلم
 * داده از APIهای سرور می‌آید و والد فقط فرزندان خودش را می‌بیند.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, computeStreak, useRoshd, UserProgress } from "@/store/roshd";
import {
  BADGE_INFO,
  CERT_THRESHOLD,
  FIELDS,
  LEVELS,
} from "@/lib/missions-data";
import {
  fmtDeadline,
  JMONTHS,
  monthLen,
  toFa,
  toJalali,
} from "@/lib/jalali";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Images,
  Loader2,
  Megaphone,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  Sprout,
  Trophy,
  UserRound,
} from "lucide-react";
import { BadgeIcon } from "./icons";
import UserAvatar from "./user-avatar";
import SchoolGallery from "./school-gallery";
import ShowcaseGallery from "./showcase-gallery";
import WeeklyReport from "./weekly-report";
import EmptyState from "./empty-state";
import Mascot from "./mascot";
import "./parent.css";

/* ---------- انواع داده ---------- */

interface MissionRow {
  title: string;
  status: "pending" | "approved" | "revision";
  teacherNote: string;
  day: string;
  at: string;
}

interface SubRow {
  id: string;
  assignmentTitle: string;
  fileName: string;
  extraName: string;
  note: string;
  at: string;
}

interface Child {
  username: string;
  name: string;
  avatar: string;
  field: string;
  level: string;
  completed: Record<string, boolean>;
  badges: string[];
  updatedAt: string | null;
  submissions: SubRow[];
  missionStats?: { pending: number; approved: number; revision: number };
  missionRecent?: MissionRow[];
  missionToday?: MissionRow[];
}

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  important: boolean;
  createdAt: string;
  read: boolean;
}

interface EventRow {
  id: string;
  title: string;
  description: string;
  kind: string;
  startsAt: string;
}

interface MessageRow {
  id: string;
  subject: string;
  body: string;
  reply: string;
  status: "sent" | "answered";
  createdAt: string;
  repliedAt: string | null;
  studentUsername: string;
}

type Section =
  | "gallery"
  | "child"
  | "showcase"
  | "reports"
  | "news"
  | "calendar"
  | "messages";

const SECTIONS: { id: Section; label: string; Icon: typeof Images }[] = [
  { id: "gallery", label: "گالری مدرسه", Icon: Images },
  { id: "child", label: "وضعیت فرزند", Icon: UserRound },
  { id: "showcase", label: "نمایشگاه فرزند", Icon: Sparkles },
  { id: "reports", label: "گزارش هفتگی", Icon: CalendarRange },
  { id: "news", label: "اطلاعیه‌ها", Icon: Megaphone },
  { id: "calendar", label: "تقویم مدرسه", Icon: CalendarDays },
  { id: "messages", label: "ارتباط با معلم", Icon: MessageCircle },
];

const EVENT_STYLE: Record<string, { label: string; tone: string }> = {
  meeting: { label: "جلسهٔ اولیا", tone: "meeting" },
  exam: { label: "امتحان", tone: "exam" },
  trip: { label: "اردو", tone: "trip" },
  holiday: { label: "تعطیلی", tone: "holiday" },
  event: { label: "رویداد", tone: "event" },
};

const MISSION_FA: Record<string, string> = {
  pending: "در انتظار بررسی",
  approved: "تایید شده",
  revision: "نیاز به اصلاح",
};

/* ---------- ابزارها ---------- */

function fieldName(f: string) {
  return FIELDS[f]?.name || "—";
}
function levelName(l: string) {
  return LEVELS[l] || "—";
}

/** روزِ داخل کلید ماموریت: field_level_day_idx */
function dayOfKey(key: string): string {
  const parts = key.split("_");
  return parts[2] || "";
}

function safeStreak(s: Child): number {
  if (!s.field || !FIELDS[s.field]) return 0;
  try {
    return computeStreak({
      name: s.name,
      avatar: "",
      field: s.field,
      level: s.level,
      completed: s.completed,
      used: {},
      daily: {},
      badges: s.badges,
    } as UserProgress);
  } catch {
    return 0;
  }
}

/* ---------- صفحه ---------- */

export default function ParentScreen() {
  const serverUser = useRoshd((s) => s.serverUser);
  const pushToast = useRoshd((s) => s.pushToast);
  const setAnnouncementUnread = useRoshd((s) => s.setAnnouncementUnread);
  const reportUnread = useRoshd((s) => s.reportUnread);
  const setReportUnread = useRoshd((s) => s.setReportUnread);

  const [section, setSection] = useState<Section>("gallery");
  const [children, setChildren] = useState<Child[] | null>(null);
  const [childName, setChildName] = useState<string>("");
  const [error, setError] = useState("");

  const [news, setNews] = useState<AnnouncementRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [galleryKey, setGalleryKey] = useState(0);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ov, an, ev, ms] = await Promise.all([
        api("/api/parent/overview"),
        api("/api/announcements").catch(() => ({ items: [], unread: 0 })),
        api("/api/events").catch(() => ({ items: [] })),
        api("/api/messages").catch(() => ({ items: [] })),
      ]);
      setChildren(ov.students || []);
      setNews(an.items || []);
      setEvents(ev.items || []);
      setMessages(ms.items || []);
      setAnnouncementUnread(an.unread || 0);
      setChildName((prev) => prev || ov.students?.[0]?.username || "");
      setError("");
      /* نشان «گزارش جدید» — گزارش هفتهٔ جاری با اولین بازدید ساخته می‌شود */
      if (ov.students?.length) {
        api("/api/parent/reports")
          .then((rp) => setReportUnread(rp.unread || 0))
          .catch(() => {});
      }
    } catch (e) {
      setError((e as Error).message);
      setChildren([]);
    }
  }, [setAnnouncementUnread, setReportUnread]);

  useEffect(() => {
    load();
  }, [load]);

  const child = useMemo(
    () => children?.find((c) => c.username === childName) || children?.[0] || null,
    [children, childName]
  );

  const unreadCount = news.filter((n) => !n.read).length;

  /* با باز کردن اطلاعیه‌ها، همه خوانده‌شده علامت می‌خورند */
  useEffect(() => {
    if (section !== "news" || !unreadCount) return;
    setNews((list) => list.map((n) => ({ ...n, read: true })));
    setAnnouncementUnread(0);
    api("/api/announcements/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }, [section, unreadCount, setAnnouncementUnread]);

  const upcoming = useMemo(
    () => events.filter((e) => new Date(e.startsAt).getTime() >= Date.now() - 864e5),
    [events]
  );

  const sendMessage = async () => {
    if (subject.trim().length < 3) {
      pushToast("موضوع پیام را بنویس.");
      return;
    }
    if (body.trim().length < 5) {
      pushToast("متن پیام خیلی کوتاه است.");
      return;
    }
    setSending(true);
    try {
      await api("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          studentUsername: child?.username || "",
        }),
      });
      setSubject("");
      setBody("");
      pushToast("پیامت برای معلم رفت.");
      const ms = await api("/api/messages");
      setMessages(ms.items || []);
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="parent-wrap calm-parent" dir="rtl">
      <Mascot
        text={
          child
            ? `${child.name} این هفته ${toFa(child.missionStats?.approved || 0)} ماموریت تاییدشده دارد؛ با هم تشویقش کنیم.`
            : "سلام! گالری مدرسه، وضعیت فرزندت و پیام معلم، همه یک‌جا هستند."
        }
        mood="happy"
        size={64}
      />

      <h2 className="section-title parent-title">
        <Sparkles size={19} />
        پنل اولیا
        <span className="parent-subtitle">
          {serverUser?.role === "superadmin"
            ? "نمای مدیر سایت — همان چیزی که اولیا می‌بینند"
            : serverUser?.role === "admin"
              ? "نمای معلم از پنل اولیا"
              : "آرام ببین، تشویق کن، پیام بده"}
        </span>
      </h2>

      {/* انتخاب‌گر فرزند */}
      {children && children.length > 1 ? (
        <div className="child-switch" role="tablist" aria-label="انتخاب فرزند">
          {children.map((c) => (
            <button
              key={c.username}
              type="button"
              role="tab"
              aria-selected={child?.username === c.username}
              className={
                "child-chip" + (child?.username === c.username ? " active" : "")
              }
              onClick={() => setChildName(c.username)}
            >
              <UserAvatar src={c.avatar} name={c.name} />
              {c.name}
            </button>
          ))}
        </div>
      ) : null}

      {/* بخش‌ها */}
      <div className="parent-tabs calm-tabs" role="tablist" aria-label="بخش‌های پنل اولیا">
        {SECTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            className={"parent-tab" + (section === id ? " active" : "")}
            onClick={() => setSection(id)}
          >
            <Icon size={16} />
            {label}
            {id === "news" && unreadCount ? (
              <span className="parent-count">{toFa(unreadCount)}</span>
            ) : null}
            {id === "reports" && reportUnread ? (
              <span className="parent-count new">گزارش جدید</span>
            ) : null}
          </button>
        ))}
        <button
          type="button"
          className="parent-refresh"
          onClick={() => {
            load();
            setGalleryKey((k) => k + 1);
          }}
          aria-label="به‌روزرسانی"
          title="به‌روزرسانی داده‌ها"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {error ? (
        <div className="parent-error card" role="alert">
          <AlertTriangle size={16} /> {error}
        </div>
      ) : null}

      {children === null ? (
        <div className="calm-loading">
          <Loader2 size={18} className="spin" /> در حال خواندن داده‌ها…
        </div>
      ) : null}

      {/* ۱) گالری مدرسه */}
      {section === "gallery" ? <SchoolGallery refreshKey={galleryKey} /> : null}

      {/* ۲) وضعیت فرزند */}
      {section === "child" && children ? (
        child ? (
          <ChildStatus child={child} />
        ) : (
          <EmptyState
            title="هنوز فرزندی به حسابت وصل نشده"
            hint="از مدیر مدرسه بخواه حساب فرزندت را به این پنل وصل کند؛ بعد از آن همه‌چیز همین‌جا دیده می‌شود."
            icon={<Sprout size={26} />}
          />
        )
      ) : null}

      {/* ۲.۵) نمایشگاه کارهای فرزند — فقط مشاهده */}
      {section === "showcase" ? (
        child ? (
          <ShowcaseGallery student={child.username} />
        ) : (
          <EmptyState
            title="هنوز فرزندی به حسابت وصل نشده"
            hint="بعد از اتصال حساب فرزند، کارهای تاییدشده‌اش این‌جا قاب می‌گیرند."
            icon={<Sprout size={26} />}
          />
        )
      ) : null}

      {/* ۲.۶) گزارش هفتگی */}
      {section === "reports" ? (
        <WeeklyReport
          child={child ? { username: child.username, name: child.name } : null}
          onSeen={() => setReportUnread(0)}
        />
      ) : null}

      {/* ۳) اطلاعیه‌ها */}
      {section === "news" ? (
        news.length ? (
          <div className="news-list">
            {news.map((n) => (
              <article
                key={n.id}
                className={"news-card card" + (n.important ? " important" : "")}
              >
                <header className="news-head">
                  <b>
                    {!n.read ? <span className="news-dot" aria-hidden="true" /> : null}
                    {n.title}
                  </b>
                  {n.important ? (
                    <span className="news-flag">
                      <Bell size={12} /> مهم
                    </span>
                  ) : null}
                </header>
                <p className="news-body">{n.body}</p>
                <div className="news-date">{fmtDeadline(n.createdAt)}</div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="اطلاعیهٔ تازه‌ای نیست"
            hint="هر وقت خبری از مدرسه باشد، همین‌جا با یک نشان کوچک می‌بینی‌اش."
            icon={<Megaphone size={26} />}
          />
        )
      ) : null}

      {/* ۴) تقویم مدرسه */}
      {section === "calendar" ? (
        <SchoolCalendar events={events} upcoming={upcoming} />
      ) : null}

      {/* ۵) ارتباط با معلم */}
      {section === "messages" ? (
        <div className="msg-wrap">
          <div className="card msg-form-card">
            <h3 className="gallery-title">
              <MessageCircle size={17} /> پیام تازه به معلم
            </h3>
            <label className="mission-field">
              <span>موضوع</span>
              <input
                type="text"
                maxLength={120}
                placeholder="مثلاً: دربارهٔ تکلیف این هفته"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
            <label className="mission-field">
              <span>متن پیام</span>
              <textarea
                rows={4}
                maxLength={1500}
                placeholder="کوتاه و روشن بنویس…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <small>{toFa(body.trim().length)} از ۱۵۰۰ نویسه</small>
            </label>
            <button
              type="button"
              className="btn mission-send"
              onClick={sendMessage}
              disabled={sending}
            >
              {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              ارسال پیام
            </button>
          </div>

          <div className="msg-list">
            {messages.length ? (
              messages.map((m) => (
                <article key={m.id} className="msg-card card">
                  <header className="msg-head">
                    <b>{m.subject}</b>
                    <span
                      className={
                        "mission-chip " +
                        (m.status === "answered" ? "approved" : "pending")
                      }
                    >
                      {m.status === "answered" ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <Clock size={13} />
                      )}
                      {m.status === "answered" ? "پاسخ داده شده" : "ارسال‌شده"}
                    </span>
                  </header>
                  <p className="msg-body">{m.body}</p>
                  <div className="msg-date">{fmtDeadline(m.createdAt)}</div>
                  {m.reply ? (
                    <div className="msg-reply">
                      <b>پاسخ معلم</b>
                      <p>{m.reply}</p>
                      {m.repliedAt ? (
                        <small>{fmtDeadline(m.repliedAt)}</small>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <EmptyState
                title="هنوز پیامی نفرستاده‌ای"
                hint="هر سؤالی داری همین‌جا بنویس؛ معلم پاسخ می‌دهد."
                icon={<MessageCircle size={26} />}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- وضعیت فرزند ---------- */

function ChildStatus({ child }: { child: Child }) {
  const streak = safeStreak(child);
  const days = Object.keys(child.completed || {}).filter(
    (k) => child.completed[k]
  );
  const todayKeyStr = new Date().toDateString();
  const todayApproved = days.filter((k) => {
    const d = dayOfKey(k);
    return d && new Date(d + "T00:00:00").toDateString() === todayKeyStr;
  }).length;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);
  const weekDone = days.filter((k) => {
    const d = dayOfKey(k);
    if (!d) return false;
    const dt = new Date(d + "T00:00:00");
    return !isNaN(dt.getTime()) && dt >= weekAgo;
  }).length;

  const total = days.length;
  const certProgress = Math.min(100, Math.round((total / CERT_THRESHOLD) * 100));
  const todayMissions = child.missionToday || [];

  return (
    <div className="child-status">
      <div className="child-head card">
        <span className="parent-avatar">
          <UserAvatar src={child.avatar} name={child.name} />
        </span>
        <div className="child-who">
          <b>{child.name}</b>
          <small>
            {fieldName(child.field)} · سطح {levelName(child.level)}
          </small>
        </div>
        <div className="child-mini">
          <span>
            <Flame size={14} /> {toFa(streak)} روز متوالی
          </span>
          <span>
            <Trophy size={14} /> {toFa(total)} ماموریت تاییدشده
          </span>
        </div>
      </div>

      <div className="child-stats">
        <div className="child-stat card">
          <b>{toFa(todayApproved)}</b>
          <span>تاییدشدهٔ امروز</span>
        </div>
        <div className="child-stat card">
          <b>{toFa(weekDone)}</b>
          <span>در ۷ روز اخیر</span>
        </div>
        <div className="child-stat card">
          <b>{toFa(child.missionStats?.pending || 0)}</b>
          <span>در انتظار بررسی</span>
        </div>
        <div className="child-stat card">
          <b>{toFa(child.missionStats?.revision || 0)}</b>
          <span>نیاز به اصلاح</span>
        </div>
      </div>

      <div className="card child-section">
        <h3 className="gallery-title">ماموریت‌های امروز</h3>
        {todayMissions.length ? (
          <ul className="child-missions">
            {todayMissions.map((m, i) => (
              <li key={i} className={"status-" + m.status}>
                <span className="child-mission-title">{m.title}</span>
                <span className={"mission-chip " + m.status}>
                  {MISSION_FA[m.status] || m.status}
                </span>
                {m.teacherNote ? (
                  <span className="child-mission-note">پیام معلم: {m.teacherNote}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="note">امروز هنوز ماموریتی نفرستاده است.</p>
        )}
        {child.missionStats ? (
          <div className="child-today-total">
            {toFa(
              (child.missionStats.approved || 0) +
                (child.missionStats.pending || 0) +
                (child.missionStats.revision || 0)
            )}{" "}
            ارسال ثبت‌شده در کل — از ۴ ماموریت هر روز.
          </div>
        ) : null}
      </div>

      <div className="card child-section">
        <h3 className="gallery-title">پیشرفت هفته و گواهی</h3>
        <div className="child-bar">
          <div className="child-bar-label">
            <span>این هفته</span>
            <b>{toFa(Math.min(100, Math.round((weekDone / 28) * 100)))}٪</b>
          </div>
          <div className="progress-wrap">
            <div
              className="progress"
              style={{ width: Math.min(100, (weekDone / 28) * 100) + "%" }}
            />
          </div>
        </div>
        <div className="child-bar">
          <div className="child-bar-label">
            <span>مسیر گواهی (۳۰ ماموریت)</span>
            <b>{toFa(certProgress)}٪</b>
          </div>
          <div className="progress-wrap">
            <div className="progress" style={{ width: certProgress + "%" }} />
          </div>
        </div>
      </div>

      <div className="card child-section">
        <h3 className="gallery-title">نشان‌ها</h3>
        <div className="parent-badges" aria-label="نشان‌ها">
          {child.badges.filter((b) => BADGE_INFO[b]).length ? (
            child.badges
              .filter((b) => BADGE_INFO[b])
              .map((b) => (
                <span key={b} className="parent-badge" title={BADGE_INFO[b].desc}>
                  <BadgeIcon id={b} size={14} />
                  {BADGE_INFO[b].title}
                </span>
              ))
          ) : (
            <span className="parent-badge muted">هنوز نشانی به دست نیاورده</span>
          )}
        </div>
        <div className="parent-updated">
          آخرین به‌روزرسانی:{" "}
          {child.updatedAt ? fmtDeadline(child.updatedAt) : "هنوز ثبت نشده"}
        </div>
      </div>
    </div>
  );
}

/* ---------- تقویم ---------- */

function SchoolCalendar({
  events,
  upcoming,
}: {
  events: EventRow[];
  upcoming: EventRow[];
}) {
  const [offset, setOffset] = useState(0);

  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + offset);
  const j = toJalali(base);
  const len = monthLen(j.jy, j.jm);
  const weekday = (base.getDay() + 1) % 7; // شنبه = ۰

  const byDay = new Map<number, EventRow[]>();
  for (const e of events) {
    const d = new Date(e.startsAt);
    if (isNaN(d.getTime())) continue;
    const ej = toJalali(d);
    if (ej.jy === j.jy && ej.jm === j.jm) {
      const list = byDay.get(ej.jd) || [];
      list.push(e);
      byDay.set(ej.jd, list);
    }
  }

  return (
    <div className="cal-wrap">
      <div className="card cal-card">
        <div className="cal-head">
          <button
            type="button"
            className="iconbtn"
            aria-label="ماه قبل"
            onClick={() => setOffset((o) => o - 1)}
          >
            <ChevronRight size={18} />
          </button>
          <b>
            {JMONTHS[j.jm - 1]} {toFa(j.jy)}
          </b>
          <button
            type="button"
            className="iconbtn"
            aria-label="ماه بعد"
            onClick={() => setOffset((o) => o + 1)}
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        <div className="cal-weekdays" aria-hidden="true">
          {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="cal-grid">
          {Array.from({ length: weekday }).map((_, i) => (
            <span key={"pad" + i} className="cal-cell empty" />
          ))}
          {Array.from({ length: len }).map((_, i) => {
            const day = i + 1;
            const has = byDay.get(day)?.length || 0;
            const isToday =
              offset === 0 && toJalali(new Date()).jd === day;
            return (
              <span
                key={day}
                className={
                  "cal-cell" + (has ? " has-event" : "") + (isToday ? " today" : "")
                }
                title={has ? `${toFa(has)} رویداد` : undefined}
              >
                {toFa(day)}
                {has ? <i className="cal-dot" /> : null}
              </span>
            );
          })}
        </div>
      </div>

      <div className="card cal-list-card">
        <h3 className="gallery-title">
          <CalendarDays size={17} /> رویدادهای پیش‌رو
        </h3>
        {upcoming.length ? (
          <ul className="event-list">
            {upcoming.map((e) => {
              const st = EVENT_STYLE[e.kind] || EVENT_STYLE.event;
              return (
                <li key={e.id} className={"event-item " + st.tone}>
                  <span className="event-kind">{st.label}</span>
                  <b>{e.title}</b>
                  {e.description ? <p>{e.description}</p> : null}
                  <span className="event-date">{fmtDeadline(e.startsAt)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            title="رویدادی در پیش نیست"
            hint="تقویم مدرسه آرام است؛ خبرهای بعدی همین‌جا اضافه می‌شوند."
            icon={<CalendarDays size={26} />}
          />
        )}
      </div>
    </div>
  );
}
