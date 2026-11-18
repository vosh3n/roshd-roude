"use client";

import { useCallback, useEffect, useState } from "react";
import { api, MISSION_STATUS_TEXT, MissionStatus, useRoshd } from "@/store/roshd";
import { MISSION_KIND_TEXT, MissionKind } from "@/lib/missions-data";
import { fmtDeadline, toFa } from "@/lib/jalali";
import {
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  RotateCcw,
} from "lucide-react";
import EmptyState from "./empty-state";

interface Row {
  id: string;
  student: string;
  studentName: string;
  title: string;
  kind: MissionKind;
  day: string;
  text: string;
  link: string;
  fileName: string;
  fileType: string;
  hasFile: boolean;
  status: MissionStatus;
  teacherNote: string;
  updatedAt: string;
}

type Filter = "pending" | "revision" | "approved" | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "pending", label: "در انتظار بررسی" },
  { id: "revision", label: "نیاز به اصلاح" },
  { id: "approved", label: "تایید شده" },
  { id: "all", label: "همه" },
];

/** بخش «ماموریت‌ها»ی پنل معلم — تایید یا برگرداندن ارسال با دلیل */
export default function TeacherMissions() {
  const pushToast = useRoshd((s) => s.pushToast);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api("/api/admin/missions");
      setRows(d.submissions || []);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (row: Row, action: "approve" | "revision") => {
    const note = (notes[row.id] ?? row.teacherNote ?? "").trim();
    if (action === "revision" && note.length < 3) {
      setError("برای برگشت دادن، دلیل را بنویس (حداقل ۳ نویسه).");
      return;
    }
    setBusy(row.id);
    setError("");
    try {
      await api("/api/admin/missions/" + row.id, {
        method: "POST",
        body: JSON.stringify({ action, note }),
      });
      setRows(
        (list) =>
          list?.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  status: action === "approve" ? "approved" : "revision",
                  teacherNote: note,
                }
              : r
          ) || null
      );
      pushToast(
        action === "approve"
          ? `ماموریت ${row.studentName} تایید شد`
          : `برای ${row.studentName} پیام اصلاح ثبت شد`
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const counts = { pending: 0, revision: 0, approved: 0 };
  for (const r of rows || []) {
    if (r.status in counts) counts[r.status as keyof typeof counts]++;
  }
  const shown = (rows || []).filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="teacher-missions">
      <div className="mission-filters" role="tablist" aria-label="فیلتر وضعیت ماموریت‌ها">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={"mission-filter" + (filter === f.id ? " active" : "")}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {f.id !== "all" ? (
              <span className="mission-filter-count">
                {toFa(counts[f.id as keyof typeof counts])}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error ? (
        <div className="error-msg" role="alert">
          {error}
        </div>
      ) : null}

      {rows === null ? (
        <div className="empty">در حال خواندن ارسال‌ها…</div>
      ) : shown.length === 0 ? (
        <EmptyState
          title={
            filter === "pending"
              ? "ارسال جدیدی در صف بررسی نیست"
              : filter === "revision"
                ? "هیچ ارسالی در وضعیت «نیاز به اصلاح» نیست"
                : "چیزی برای نمایش نیست"
          }
          hint="به‌محض اینکه دانش‌آموزی کاری بفرستد، همین‌جا دیده می‌شود."
          icon={<Inbox size={26} />}
        />
      ) : (
        <div className="review-list">
          {shown.map((r) => (
            <article key={r.id} className={"review-card card status-" + r.status}>
              <header className="review-head">
                <div>
                  <b>{r.studentName}</b>
                  <small className="review-user">@{r.student}</small>
                </div>
                <div className="review-chips">
                  <span className={"mission-kind " + r.kind}>
                    {MISSION_KIND_TEXT[r.kind]}
                  </span>
                  <span className={"mission-chip " + r.status}>
                    {r.status === "approved" ? (
                      <CheckCheck size={13} />
                    ) : r.status === "pending" ? (
                      <Clock size={13} />
                    ) : (
                      <RotateCcw size={13} />
                    )}
                    {MISSION_STATUS_TEXT[r.status]}
                  </span>
                </div>
              </header>

              <p className="review-title">{r.title}</p>
              {r.text ? <p className="review-text">{r.text}</p> : null}

              <div className="review-files">
                {r.link ? (
                  <a
                    className="mission-link"
                    href={r.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={14} /> {r.link}
                  </a>
                ) : null}
                {r.hasFile ? (
                  <a
                    className="mission-file"
                    href={"/api/missions/" + r.id + "/file?inline=1"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText size={14} /> {r.fileName}
                  </a>
                ) : null}
              </div>

              <div className="review-meta">
                ارسال: {fmtDeadline(r.updatedAt)}
              </div>

              <label className="review-note">
                <span>پیام برای دانش‌آموز</span>
                <textarea
                  rows={2}
                  maxLength={1000}
                  placeholder="مثلاً: خیلی خوب بود، فقط دلیل انتخاب رنگ‌ها را هم بنویس."
                  value={notes[r.id] ?? r.teacherNote ?? ""}
                  onChange={(e) =>
                    setNotes({ ...notes, [r.id]: e.target.value })
                  }
                />
              </label>

              <div className="review-actions">
                <button
                  type="button"
                  className="btn review-approve"
                  disabled={busy === r.id || r.status === "approved"}
                  onClick={() => review(r, "approve")}
                >
                  {busy === r.id ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  تایید
                </button>
                <button
                  type="button"
                  className="btn ghost review-revision"
                  disabled={busy === r.id}
                  onClick={() => review(r, "revision")}
                >
                  <RotateCcw size={15} />
                  نیاز به اصلاح
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
