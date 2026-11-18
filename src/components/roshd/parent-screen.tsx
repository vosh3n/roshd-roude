"use client";

/**
 * پنل مشاهدهٔ اولیا — فقط-مشاهده (read-only)
 * داده از GET /api/parent/overview؛ بدون هیچ دکمهٔ تغییردهنده
 */

import { useCallback, useEffect, useState } from "react";
import { api, useRoshd, UserProgress, computeStreak } from "@/store/roshd";
import { BADGE_INFO, FIELDS, LEVELS } from "@/lib/missions-data";
import { fmtDeadline, toFa } from "@/lib/jalali";
import {
  AlertTriangle,
  ClipboardList,
  Flame,
  Inbox,
  Paperclip,
  RefreshCw,
  Sprout,
  Upload,
  Users,
} from "lucide-react";
import { BadgeIcon, FieldIcon } from "./icons";
import UserAvatar from "./user-avatar";
import "./parent.css";

interface SubRow {
  id: string;
  assignmentTitle: string;
  fileName: string;
  extraName: string;
  note: string;
  at: string;
  student: StudentOverview;
}

interface StudentOverview {
  username: string;
  name: string;
  avatar: string;
  field: string;
  level: string;
  completed: Record<string, boolean>;
  badges: string[];
  updatedAt: string | null;
  submissions: SubRow[];
  /** وضعیت ماموریت‌های روزانه — فقط مشاهده */
  missionStats?: { pending: number; approved: number; revision: number };
  missionRecent?: {
    title: string;
    status: "pending" | "approved" | "revision";
    teacherNote: string;
    at: string;
  }[];
}

const MISSION_STATUS_FA: Record<string, string> = {
  pending: "در انتظار بررسی",
  approved: "تایید شده",
  revision: "نیاز به اصلاح",
};

/** استریک امن — اگر دادهٔ ناقص بود صفر برگردانَد (بدون crash) */
function safeStreak(s: StudentOverview): number {
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

function totalDone(completed: Record<string, boolean>): number {
  try {
    return Object.values(completed).filter(Boolean).length;
  } catch {
    return 0;
  }
}

function fieldName(f: string): string {
  return FIELDS[f]?.name || f || "—";
}

function levelName(l: string): string {
  return LEVELS[l] || l || "—";
}

export default function ParentScreen() {
  const serverUser = useRoshd((s) => s.serverUser);
  const [students, setStudents] = useState<StudentOverview[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"students" | "submissions">("students");

  /** واکشی داده — همهٔ setStateها داخل continuation های async هستند */
  const fetchOverview = useCallback(async () => {
    try {
      const d = await api("/api/parent/overview");
      setStudents(d.students);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const refresh = () => {
    setLoading(true);
    fetchOverview();
  };

  /* همهٔ ارسال‌ها به تفکیک تکلیف (مرتب از جدید به قدین — از سرور می‌آید) */
  const allSubs: SubRow[] =
    students?.flatMap((s) =>
      s.submissions.map((x): SubRow => ({ ...x, student: s }))
    ) ?? [];
  const grouped = new Map<string, SubRow[]>();
  for (const sub of allSubs) {
    const list = grouped.get(sub.assignmentTitle) || [];
    list.push(sub);
    grouped.set(sub.assignmentTitle, list);
  }

  const subCountOf = (username: string) =>
    students?.find((s) => s.username === username)?.submissions.length ?? 0;

  return (
    <div className="parent-wrap" dir="rtl">
      <h2 className="section-title parent-title">
        <Users size={19} />
        پنل اولیا
        <span className="parent-subtitle">
          {serverUser?.role === "admin"
            ? "نمای معلم — پیشرفت و ارسال‌های دانش‌آموزان"
            : "پیشرفت و ارسال‌های دانش‌آموزان را فقط مشاهده کنید"}
        </span>
      </h2>

      {/* تب‌ها */}
      <div className="parent-tabs" role="tablist" aria-label="بخش‌های پنل اولیا">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "students"}
          className={"parent-tab" + (tab === "students" ? " active" : "")}
          onClick={() => setTab("students")}
        >
          <Users size={16} />
          دانش‌آموزان
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "submissions"}
          className={"parent-tab" + (tab === "submissions" ? " active" : "")}
          onClick={() => setTab("submissions")}
        >
          <Upload size={16} />
          تکالیف ارسال‌شده
          {allSubs.length ? (
            <span className="parent-count">{toFa(allSubs.length)}</span>
          ) : null}
        </button>
        <button
          type="button"
          className="parent-refresh"
          onClick={refresh}
          disabled={loading}
          aria-label="به‌روزرسانی داده‌ها"
          title="به‌روزرسانی داده‌ها"
        >
          {loading ? "…" : <RefreshCw size={16} />}
        </button>
      </div>

      {/* خطا */}
      {error ? (
        <div className="parent-error card" role="alert">
          <AlertTriangle size={16} /> {error} —{" "}
          <button type="button" className="parent-btn" onClick={refresh}>
            تلاش دوباره
          </button>
        </div>
      ) : null}

      {/* اسکلت بارگذاری */}
      {loading && !students ? (
        <div className="parent-skeletons" aria-hidden="true">
          <div className="parent-skel" />
          <div className="parent-skel" />
          <div className="parent-skel" />
        </div>
      ) : null}

      {/* حالت خالی */}
      {!loading && !error && students && students.length === 0 ? (
        <div className="parent-empty card">
          <Sprout size={16} /> هنوز داده‌ای ثبت نشده — به‌محض شروع
          دانش‌آموزان، پیشرفت‌شان اینجا دیده می‌شود.
        </div>
      ) : null}

      {/* ۱) دانش‌آموزان */}
      {tab === "students" && students && students.length > 0 ? (
        <div className="parent-students">
          {students.map((s) => {
            const streak = safeStreak(s);
            const total = totalDone(s.completed);
            return (
              <article key={s.username} className="parent-card card">
                <div className="parent-head">
                  <span className="parent-avatar">
                    <UserAvatar src={s.avatar} name={s.name} />
                  </span>
                  <div className="parent-who">
                    <div className="parent-name">{s.name}</div>
                    <div className="parent-username">@{s.username}</div>
                  </div>
                  <span className="parent-chip">
                    <FieldIcon id={s.field} size={15} />
                    {fieldName(s.field)}
                  </span>
                </div>

                <div className="parent-stats">
                  <div className="parent-stat">
                    <span className="parent-stat-num">{toFa(total)}</span>
                    <span className="parent-stat-label">ماموریت انجام‌شده</span>
                  </div>
                  <div className="parent-stat">
                    <span className="parent-stat-num">
                      <Flame size={14} /> {toFa(streak)}
                    </span>
                    <span className="parent-stat-label">روز متوالی</span>
                  </div>
                  <div className="parent-stat">
                    <span className="parent-stat-num">{toFa(levelName(s.level))}</span>
                    <span className="parent-stat-label">سطح</span>
                  </div>
                  <div className="parent-stat">
                    <span className="parent-stat-num">{toFa(subCountOf(s.username))}</span>
                    <span className="parent-stat-label">ارسال تکلیف</span>
                  </div>
                </div>

                <div className="parent-badges" aria-label="نشان‌ها">
                  {s.badges.length ? (
                    s.badges
                      .filter((b) => BADGE_INFO[b])
                      .map((b) => (
                        <span key={b} className="parent-badge" title={BADGE_INFO[b].desc}>
                          <BadgeIcon id={b} size={14} />
                          {BADGE_INFO[b].title}
                        </span>
                      ))
                  ) : (
                    <span className="parent-badge muted">هنوز نشانی ثبت نشده</span>
                  )}
                </div>

                {(s.missionStats || s.missionRecent) && (
                  <div className="parent-missions">
                    <b className="parent-missions-head">ماموریت‌های روزانه</b>
                    <div className="parent-mission-counts">
                      <span className="parent-mstat approved">
                        تایید شده {toFa(s.missionStats?.approved || 0)}
                      </span>
                      <span className="parent-mstat pending">
                        در انتظار {toFa(s.missionStats?.pending || 0)}
                      </span>
                      <span className="parent-mstat revision">
                        نیاز به اصلاح {toFa(s.missionStats?.revision || 0)}
                      </span>
                    </div>
                    {s.missionRecent?.length ? (
                      <ul className="parent-mission-list">
                        {s.missionRecent.map((m, i) => (
                          <li key={m.title + i}>
                            <span className="parent-mission-title">{m.title}</span>
                            <span className={"parent-mstat " + m.status}>
                              {MISSION_STATUS_FA[m.status] || m.status}
                            </span>
                            {m.teacherNote ? (
                              <span className="parent-mission-note">
                                پیام معلم: {m.teacherNote}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="parent-mission-empty">
                        هنوز ماموریتی ارسال نشده است.
                      </div>
                    )}
                  </div>
                )}

                <div className="parent-updated">
                  آخرین به‌روزرسانی:{" "}
                  {s.updatedAt ? fmtDeadline(s.updatedAt) : "هنوز sync نشده"}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {/* ۲) تکالیف ارسال‌شده */}
      {tab === "submissions" && students && students.length > 0 ? (
        <div className="parent-subs">
          {allSubs.length === 0 ? (
            <div className="parent-empty card">
              <Inbox size={16} /> هنوز هیچ تکلیفی ارسال نشده است.
            </div>
          ) : (
            [...grouped.entries()].map(([title, subs]) => (
              <article key={title} className="parent-card card">
                <b className="parent-assignment">
                  <ClipboardList size={16} />
                  {title}
                </b>
                {subs.map((sub) => (
                  <div key={sub.id} className="parent-sub-row">
                    <div className="parent-sub-info">
                      <div className="parent-sub-name">{sub.student.name}</div>
                      <div className="parent-sub-file">
                        <Paperclip size={13} />
                        {sub.fileName}
                      </div>
                      {sub.extraName ? (
                        <div className="parent-sub-file">
                          <Paperclip size={13} />
                          {sub.extraName} (فایل اضافه)
                        </div>
                      ) : null}
                      {sub.note ? (
                        <div className="parent-sub-note">{sub.note}</div>
                      ) : null}
                      <div className="parent-sub-date">{fmtDeadline(sub.at)}</div>
                    </div>
                    <div className="parent-sub-actions">
                      <a
                        className="parent-btn"
                        href={
                          "/api/submissions/" + encodeURIComponent(sub.id) + "/file"
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        مشاهده فایل
                      </a>
                      {sub.extraName ? (
                        <a
                          className="parent-btn secondary"
                          href={
                            "/api/submissions/" +
                            encodeURIComponent(sub.id) +
                            "/file?extra=1"
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          فایل اضافه
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </article>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
