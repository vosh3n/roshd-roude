"use client";

import { useMemo } from "react";
import {
  useRoshd,
  computeStreak,
  totalCompleted,
  MISSION_STATUS_TEXT,
  MissionStatus,
} from "@/store/roshd";
import {
  FIELDS,
  LEVELS,
  BADGE_INFO,
  CERT_THRESHOLD,
  MISSION_KIND_TEXT,
  missionKind,
} from "@/lib/missions-data";
import { toFa, dayKey } from "@/lib/jalali";
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  Lock,
  MessageSquare,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { BadgeIcon, FieldIcon } from "./icons";
import UserAvatar from "./user-avatar";
import Mascot from "./mascot";
import ProgressPath, { PathItem } from "./progress-path";

/* ---------- تب امروز: ماموریت‌ها ---------- */

function MissionsTab() {
  const curUser = useRoshd((s) => s.curUser);
  const missionsForToday = useRoshd((s) => s.missionsForToday);
  const openMission = useRoshd((s) => s.openMission);
  const missions = useRoshd((s) => s.missions);
  const appData = useRoshd((s) => s.appData);
  const u = curUser();
  const ids = useMemo(() => missionsForToday(), [missionsForToday, appData]);

  if (!u || !u.field || !u.level) return null;
  const pool = FIELDS[u.field].missions;
  const k = u.field + "_" + u.level;
  const dk = dayKey();
  const keyOf = (i: number) => k + "_" + dk + "_" + i;

  const items: PathItem[] = ids.map((idx, n) => {
    const sub = missions[keyOf(idx)];
    return {
      key: keyOf(idx),
      label: "ماموریت " + toFa(n + 1),
      title: pool[idx],
      status: sub?.status || "none",
      kind: sub?.kind || missionKind(u.field as string, idx),
    };
  });

  const doneToday = ids.filter((i) => u.completed[keyOf(i)]).length;
  const pendingToday = items.filter((i) => i.status === "pending").length;
  const revisionToday = items.filter((i) => i.status === "revision").length;

  // آمار هفته
  let completedThisWeek = 0;
  for (let x = 0; x < 7; x++) {
    const dt = new Date();
    dt.setDate(dt.getDate() - x);
    const wdk = dayKey(dt);
    for (let i = 0; i < pool.length; i++) {
      if (u.completed[k + "_" + wdk + "_" + i]) completedThisWeek++;
    }
  }
  const wp = Math.min(100, Math.round((completedThisWeek / 28) * 100));
  const streak = computeStreak(u);

  /* جملهٔ ماسکات بر اساس وضعیت واقعی امروز */
  let line = "سلام! امروز ۴ کار کوچک داریم؛ کافی است یکی‌یکی شروع کنیم.";
  let mood: "happy" | "cheer" | "think" | "sleepy" = "happy";
  if (doneToday === ids.length && ids.length > 0) {
    line = "حالا وقت استراحت است؛ امروز را کامل تایید گرفتی!";
    mood = "cheer";
  } else if (revisionToday > 0) {
    line = "یکی از کارهات پیام معلم دارد؛ با هم درستش می‌کنیم.";
    mood = "think";
  } else if (pendingToday > 0) {
    line = "ارسالت دست معلم است؛ تا بررسی شود می‌توانی ایستگاه بعدی را شروع کنی.";
    mood = "happy";
  } else if (doneToday > 0) {
    line = "شروع خوبی بود! همین ریتم را نگه دار.";
    mood = "cheer";
  }

  return (
    <div className="tabpane active" id="missionsTab">
      <Mascot text={line} mood={mood} />

      <ProgressPath items={items} onOpen={openMission} />

      <div className="stats calm-stats">
        <div className="stat">
          <b>{toFa(doneToday)}</b>
          <span>از ۴ ماموریت امروز تایید شده</span>
          <div className="progress-wrap">
            <div
              className="progress"
              id="dayProgress"
              style={{ width: (doneToday / 4) * 100 + "%" }}
            />
          </div>
        </div>
        <div className="stat">
          <b>{toFa(streak)}</b>
          <span>روز متوالی فعال</span>
        </div>
        <div className="stat">
          <b>{toFa(wp)}٪</b>
          <span>پیشرفت این هفته</span>
        </div>
      </div>

      <div className="card missions">
        <h2 className="section-title">کارهای امروز</h2>
        <div id="missionList" className="mission-list">
          {ids.map((idx, n) => {
            const key = keyOf(idx);
            const sub = missions[key];
            const status: MissionStatus | "none" = sub ? sub.status : "none";
            const kind = sub?.kind || missionKind(u.field as string, idx);
            return (
              <button
                key={key}
                type="button"
                className={"mission-card status-" + status}
                onClick={() => openMission(key)}
                aria-label={"باز کردن ماموریت " + toFa(n + 1)}
              >
                <span className="mission-card-top">
                  <span className="day">ماموریت {toFa(n + 1)}</span>
                  <span className={"mission-chip " + status}>
                    {status === "approved" ? (
                      <CheckCircle2 size={13} />
                    ) : status === "pending" ? (
                      <Clock size={13} />
                    ) : status === "revision" ? (
                      <RotateCcw size={13} />
                    ) : null}
                    {MISSION_STATUS_TEXT[status]}
                  </span>
                </span>
                <span className="mission-title">{pool[idx]}</span>
                <span className="mission-meta">
                  <span className={"mission-kind " + kind}>
                    {MISSION_KIND_TEXT[kind]}
                  </span>
                  سطح {LEVELS[u.level as string]} · امروز
                </span>
                {status === "revision" && sub?.teacherNote ? (
                  <span className="mission-card-note">
                    <MessageSquare size={13} /> {sub.teacherNote}
                  </span>
                ) : null}
                <span className="mission-card-go">
                  {status === "none"
                    ? "شروع کن"
                    : status === "revision"
                      ? "اصلاح و ارسال دوباره"
                      : "دیدن وضعیت"}
                  <ChevronLeft size={15} />
                </span>
              </button>
            );
          })}
        </div>
        <p className="note">
          ماموریت وقتی «انجام‌شده» حساب می‌شود که کارت را برای معلم بفرستی و
          معلم تاییدش کند. هر ارسال می‌تواند یک عکس، فایل، لینک یا خلاصهٔ
          نوشتهٔ خودت باشد.
        </p>
      </div>
      <div style={{ height: "1rem" }} />
    </div>
  );
}

/* ---------- تب هفتگی ---------- */

function WeekTab() {
  const curUser = useRoshd((s) => s.curUser);
  const u = curUser();
  if (!u || !u.field) return null;
  const pool = FIELDS[u.field].missions;
  const k = u.field + "_" + u.level;

  let completedThisWeek = 0;
  for (let x = 0; x < 7; x++) {
    const dt = new Date();
    dt.setDate(dt.getDate() - x);
    const wdk = dayKey(dt);
    for (let i = 0; i < pool.length; i++) {
      if (u.completed[k + "_" + wdk + "_" + i]) completedThisWeek++;
    }
  }
  const wp = Math.min(100, Math.round((completedThisWeek / 28) * 100));

  const cells: React.ReactNode[] = [];
  for (let x = 29; x >= 0; x--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - x);
    const dk = dayKey(dt);
    let count = 0;
    for (let i = 0; i < pool.length; i++) {
      if (u.completed[k + "_" + dk + "_" + i]) count++;
    }
    let cls = "hcell";
    if (count >= 4) cls += " l4";
    else if (count >= 3) cls += " l3";
    else if (count >= 2) cls += " l2";
    else if (count >= 1) cls += " l1";
    cells.push(
      <div
        key={dk}
        className={cls}
        title={dt.toLocaleDateString("fa-IR") + " — " + toFa(count) + " ماموریت"}
      />
    );
  }

  return (
    <div className="tabpane active" id="weekTab">
      <div className="card week">
        <div className="week-head">
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>
              پیشرفت هفتگی
            </h2>
            <div className="note">
              هدف این هفته: انجام ۲۸ ماموریت (۴ ماموریت × ۷ روز)
            </div>
          </div>
          <div className="percent" id="weekBig">
            {toFa(wp)}٪
          </div>
        </div>
        <div className="progress-wrap" style={{ height: "0.8125rem", marginTop: "1.125rem" }}>
          <div className="progress" id="weekProgress" style={{ width: wp + "%" }} />
        </div>
        <div className="note" id="weekText">
          این هفته {toFa(completedThisWeek)} ماموریت از {toFa(28)} ماموریت هدف
          انجام شده است.
        </div>
        <div className="note" style={{ marginTop: "1.25rem", fontWeight: 700, color: "var(--text)" }}>
          فعالیت ۳۰ روز اخیر
        </div>
        <div className="heatmap" id="heatmap" role="img" aria-label="نقشه فعالیت ۳۰ روز اخیر">
          {cells}
        </div>
      </div>
    </div>
  );
}

/* ---------- تب نشان‌ها ---------- */

function BadgesTab() {
  const curUser = useRoshd((s) => s.curUser);
  const setScreen = useRoshd((s) => s.setScreen);
  const u = curUser();
  if (!u) return null;
  const total = totalCompleted(u);
  const unlocked = total >= CERT_THRESHOLD;

  return (
    <div className="tabpane active" id="badgesTab">
      <div className="card" style={{ padding: "1.5625rem" }}>
        <h2 className="section-title">نشان‌های تو</h2>
        <div className="badge-grid" id="badgeGrid">
          {Object.entries(BADGE_INFO).map(([id, b]) => {
            const got = u.badges.includes(id);
            return (
              <div key={id} className={"badge" + (got ? "" : " locked")}>
                <div className="bicon">
                  {got ? <BadgeIcon id={id} /> : <Lock size={20} />}
                </div>
                <b>{b.title}</b>
                <span>{b.desc}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card certificate-wrap" id="certCard">
        <h2 className="section-title" style={{ margin: 0 }}>
          گواهی افتخار
        </h2>
        <p className="note" id="certHint">
          {unlocked
            ? "گواهی اختصاصی‌ات آماده‌ست."
            : "با انجام " +
              toFa(CERT_THRESHOLD) +
              " ماموریت، گواهی اختصاصی‌ات باز می‌شود. («" +
              toFa(total) +
              " از " +
              toFa(CERT_THRESHOLD) +
              "»)"}
        </p>
        <button
          className={unlocked ? "btn" : "btn hidden"}
          id="certBtn"
          onClick={() => setScreen("cert")}
        >
          مشاهده و چاپ گواهی
        </button>
      </div>
    </div>
  );
}

/* ---------- تب رتبه‌بندی ---------- */

function LeaderboardTab() {
  const appData = useRoshd((s) => s.appData);

  const rows = Object.entries(appData.users)
    .filter(([, u]) => u.field && u.level)
    .map(([username, u]) => ({
      username,
      total: totalCompleted(u),
      streak: computeStreak(u),
      avatar: u.avatar,
      displayName: u.name,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="tabpane active" id="lbTab">
      <div className="card" style={{ padding: "1.5625rem" }}>
        <h2 className="section-title">
          <Trophy size={18} />
          رتبه‌بندی کلاس
        </h2>
        <div className="note" style={{ marginBottom: "0.625rem" }}>
          بر اساس تعداد کل ماموریت‌های انجام‌شده، بین همه‌ی کسانی که در این
          مرورگر ثبت‌نام کرده‌اند.
        </div>
        <div id="lbList">
          {rows.length === 0 ? (
            <div className="empty">
              هنوز کسی ماموریتی را شروع نکرده. اولین نفر باش!
            </div>
          ) : (
            rows.map((r, i) => (
              <div
                key={r.username}
                className={"lb-row" + (r.username === appData.currentUser ? " me" : "")}
              >
                <div className="lb-rank">{toFa(i + 1)}</div>
                <div className="lb-avatar">
                  <UserAvatar src={r.avatar} name={r.displayName} />
                </div>
                <div className="lb-info">
                  <div className="lb-name">
                    {r.displayName}
                    {r.username === appData.currentUser ? " (تو)" : ""}
                  </div>
                  <div className="lb-sub">{toFa(r.streak)} روز متوالی</div>
                </div>
                <div className="lb-count">{toFa(r.total)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- داشبورد اصلی ---------- */

const TABS = [
  { id: "missionsTab", label: "امروز" },
  { id: "weekTab", label: "پیشرفت هفتگی" },
  { id: "badgesTab", label: "نشان‌ها" },
  { id: "lbTab", label: "رتبه‌بندی" },
];

export default function DashboardScreen() {
  const curUser = useRoshd((s) => s.curUser);
  const dashboardTab = useRoshd((s) => s.dashboardTab);
  const setDashboardTab = useRoshd((s) => s.setDashboardTab);
  const u = curUser();

  if (!u || !u.field || !u.level) {
    return (
      <div className="card hero">
        <h1>اول رشته و سطحت را انتخاب کن</h1>
      </div>
    );
  }

  return (
    <>
      <div className="card dashboard-top">
        <div>
          <div className="path">
            مسیر تو:{" "}
            <strong className="inline-icon">
              <FieldIcon id={u.field} size={16} />
              {FIELDS[u.field].name}
            </strong>{" "}
            · سطح:{" "}
            <strong>{LEVELS[u.level]}</strong>
          </div>
          <h1 style={{ margin: "0.625rem 0 0", fontSize: "1.625rem", fontFamily: "var(--font-display)" }}>
            سلام، {u.name}
          </h1>
          <div className="subtitle">
            {new Date()
              .toLocaleDateString("fa-IR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
              /* جداکننده فارسی «،» به‌جای کامای لاتین */
              .replace(/,/g, "،")}
          </div>
        </div>
      </div>

      <div className="tabbar" role="tablist">
        {TABS.map((t) => (
          <div
            key={t.id}
            className={"tabbtn" + (dashboardTab === t.id ? " active" : "")}
            data-tab={t.id}
            role="tab"
            aria-selected={dashboardTab === t.id}
            tabIndex={0}
            onClick={() => setDashboardTab(t.id)}
            onKeyDown={(e) => e.key === "Enter" && setDashboardTab(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {dashboardTab === "missionsTab" && <MissionsTab />}
      {dashboardTab === "weekTab" && <WeekTab />}
      {dashboardTab === "badgesTab" && <BadgesTab />}
      {dashboardTab === "lbTab" && <LeaderboardTab />}
    </>
  );
}
