"use client";

/**
 * گزارش هفتگی فرزند برای اولیا — شنبه تا جمعه، محاسبه‌شده در سرور از دادهٔ
 * واقعی، با تاریخچهٔ ۸ هفته، مقایسه با هفتهٔ قبل و نشان‌های تازه.
 */

import { useCallback, useEffect, useState } from "react";
import { api, useRoshd } from "@/store/roshd";
import { BADGE_INFO } from "@/lib/missions-data";
import { toFa } from "@/lib/jalali";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  Loader2,
  Minus,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import EmptyState from "./empty-state";
import Mascot from "./mascot";
import { BadgeIcon } from "./icons";

interface WeekStats {
  weekStart: string;
  weekEnd: string;
  label: string;
  isCurrent: boolean;
  missions: { approved: number; pending: number; revision: number; target: number };
  activeDays: number;
  streak: number;
  tasks: { submitted: number; approved: number; revision: number; late: number };
  revisionCount: number;
  badges: string[];
  newBadges: string[];
  certificate: { done: number; threshold: number; percent: number };
  summary: string;
  compare: "up" | "down" | "same" | null;
  compareText: string;
}

const COMPARE_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  same: Minus,
};

export default function WeeklyReport({
  child,
  onSeen,
}: {
  child: { username: string; name: string } | null;
  onSeen?: () => void;
}) {
  const pushToast = useRoshd((s) => s.pushToast);
  const [reports, setReports] = useState<WeekStats[] | null>(null);
  const [openWeek, setOpenWeek] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!child) {
      setReports([]);
      return;
    }
    try {
      const d = await api(
        "/api/parent/reports?child=" + encodeURIComponent(child.username)
      );
      setReports(d.reports || []);
      setOpenWeek((d.reports?.[0]?.weekStart as string) || null);
      /* دیدن گزارش → نشان «گزارش جدید» برداشته می‌شود */
      await api("/api/parent/reports/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child: child.username }),
      }).catch(() => {});
      onSeen?.();
    } catch (e) {
      pushToast((e as Error).message);
      setReports([]);
    }
  }, [child, pushToast, onSeen]);

  useEffect(() => {
    load();
  }, [load]);

  if (!child) {
    return (
      <EmptyState
        title="هنوز فرزندی به حسابت وصل نشده"
        hint="بعد از اتصال حساب فرزند، گزارش هر هفته همین‌جا آماده می‌شود."
        icon={<CalendarRange size={26} />}
      />
    );
  }

  if (reports === null) {
    return (
      <div className="calm-loading">
        <Loader2 size={18} className="spin" /> در حال ساختن گزارش هفته…
      </div>
    );
  }

  const current = reports[0];

  return (
    <div className="weekly-wrap">
      <div className="weekly-hero card">
        <Mascot text={current?.summary || "این هفته تازه شروع شده؛ با هم می‌سازیمش."} mood="cheer" size={64} name={false} />
        <div className="weekly-hero-side">
          <span className="weekly-week">
            <CalendarRange size={15} />
            {current ? current.label : "—"}
          </span>
          {current ? <span className="weekly-now">تا الان</span> : null}
          <button
            type="button"
            className="btn secondary"
            onClick={load}
            aria-label="به‌روزرسانی گزارش"
          >
            <RotateCcw size={15} /> به‌روزرسانی
          </button>
        </div>
      </div>

      {current ? (
        <div className="weekly-stats">
          <div className="weekly-stat card">
            <CheckCircle2 size={18} />
            <b>{toFa(current.missions.approved)}</b>
            <span>ماموریت تاییدشده از {toFa(current.missions.target)}</span>
          </div>
          <div className="weekly-stat card">
            <Flame size={18} />
            <b>{toFa(current.activeDays)}</b>
            <span>روز فعال · {toFa(current.streak)} روز متوالی</span>
          </div>
          <div className="weekly-stat card">
            <Sparkles size={18} />
            <b>{toFa(current.tasks.submitted)}</b>
            <span>
              تکلیف تحویل‌شده · {toFa(current.tasks.approved)} تایید
              {current.tasks.late ? ` · ${toFa(current.tasks.late)} دیرکرد` : ""}
            </span>
          </div>
          <div className="weekly-stat card">
            <Award size={18} />
            <b>{toFa(current.certificate.percent)}٪</b>
            <span>پیشرفت گواهی</span>
          </div>
        </div>
      ) : null}

      {reports.length ? (
        <div className="weekly-list">
          <h3 className="gallery-title">تاریخچهٔ ۸ هفته</h3>
          {reports.map((r) => {
            const Icon = r.compare ? COMPARE_ICON[r.compare] : null;
            const isOpen = openWeek === r.weekStart;
            return (
              <article
                key={r.weekStart}
                className={"card weekly-item" + (isOpen ? " open" : "")}
              >
                <button
                  type="button"
                  className="weekly-item-head"
                  onClick={() => setOpenWeek(isOpen ? null : r.weekStart)}
                  aria-expanded={isOpen}
                >
                  <span className="weekly-item-date">
                    <b>{r.label}</b>
                    {r.isCurrent ? <small>تا الان</small> : null}
                  </span>
                  <span className="weekly-item-nums">
                    {toFa(r.missions.approved)} ماموریت · {toFa(r.tasks.submitted)} تکلیف
                  </span>
                  {r.compare && Icon ? (
                    <span className={"weekly-compare " + r.compare} title={r.compareText}>
                      <Icon size={14} />
                      {r.compareText}
                    </span>
                  ) : null}
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isOpen ? (
                  <div className="weekly-item-body">
                    <p className="weekly-summary">{r.summary}</p>
                    <div className="weekly-chips">
                      <span>در انتظار بررسی: {toFa(r.missions.pending)}</span>
                      <span>نیاز به اصلاح: {toFa(r.revisionCount)}</span>
                      <span>تکالیف تاییدشده: {toFa(r.tasks.approved)}</span>
                      {r.tasks.late ? <span>دیرکرد: {toFa(r.tasks.late)}</span> : null}
                    </div>
                    {r.newBadges.length ? (
                      <div className="weekly-badges">
                        <span>نشان‌های تازه:</span>
                        {r.newBadges
                          .filter((b) => BADGE_INFO[b])
                          .map((b) => (
                            <span key={b} className="parent-badge" title={BADGE_INFO[b].desc}>
                              <BadgeIcon id={b} size={14} />
                              {BADGE_INFO[b].title}
                            </span>
                          ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="گزارشی برای نمایش نیست"
          hint="وقتی فرزندت فعالیتی ثبت کند، گزارش همان هفته همین‌جا ساخته می‌شود."
          icon={<CalendarRange size={26} />}
        />
      )}
    </div>
  );
}
