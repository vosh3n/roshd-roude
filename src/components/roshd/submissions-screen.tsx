"use client";

import { useCallback, useEffect, useState } from "react";
import { useRoshd, api } from "@/store/roshd";
import { fmtDeadline, toFa } from "@/lib/jalali";
import { FileText, Inbox, Paperclip, ClipboardList, Sparkles } from "lucide-react";
import TeacherMissions from "./teacher-missions";

interface SubmissionRow {
  id: string;
  user: string;
  name: string;
  fileName: string;
  extraName: string;
  note: string;
  at: string;
}

interface SubAssignment {
  id: string;
  title: string;
  deadline: string;
  expired: boolean;
  submissions: SubmissionRow[];
}

/**
 * صفحهٔ اصلی پنل معلم — ارسال‌های دانش‌آموزان، تکلیف به تکلیف.
 * (این صفحه همان «ارسال‌ها»ی منو است؛ به همین دلیل در منو تکرار نمی‌شود.)
 */
export default function SubmissionsScreen() {
  const setScreen = useRoshd((s) => s.setScreen);
  const [assignments, setAssignments] = useState<SubAssignment[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"tasks" | "missions">("tasks");

  const load = useCallback(() => {
    api("/api/admin/submissions")
      .then((d) => {
        setAssignments(d.assignments);
        setError("");
      })
      .catch((e) => {
        setError(e.message);
        if (e.message.includes("دسترسی")) setScreen("tasks");
      });
  }, [setScreen]);

  useEffect(() => {
    load();
  }, [load]);

  const total = (assignments || []).reduce(
    (n, a) => n + a.submissions.length,
    0
  );

  return (
    <>
      <div className="page-head">
        <h2 className="section-title">پنل معلم</h2>
        <p className="note">
          ارسال‌های تکالیف و ماموریت‌های روزانهٔ دانش‌آموزان — بررسی و تایید
          همین‌جاست.
        </p>
      </div>

      <div
        className="mission-filters teacher-tabs"
        role="tablist"
        aria-label="بخش‌های پنل معلم"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "tasks"}
          className={"mission-filter" + (tab === "tasks" ? " active" : "")}
          onClick={() => setTab("tasks")}
        >
          <ClipboardList size={16} /> تکالیف ارسال‌شده
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "missions"}
          className={"mission-filter" + (tab === "missions" ? " active" : "")}
          onClick={() => setTab("missions")}
        >
          <Sparkles size={16} /> ماموریت‌های روزانه
        </button>
      </div>

      {tab === "missions" ? <TeacherMissions /> : null}

      {tab === "tasks" ? (
        <>
      <div className="page-head">
        <h2 className="section-title">ارسال‌های دانش‌آموزان</h2>
        <p className="note">
          {assignments === null
            ? "در حال خواندن ارسال‌ها…"
            : total === 0
              ? "هنوز هیچ تکلیفی ارسال نشده است."
              : `${toFa(total)} ارسال در ${toFa(assignments.length)} تکلیف`}
        </p>
      </div>

      <div id="submissionReport" className="sub-report">
        {error ? <div className="empty card">{error}</div> : null}
        {!error && assignments === null ? (
          <div className="empty">در حال بارگذاری…</div>
        ) : null}
        {!error && assignments && assignments.length === 0 ? (
          <div className="empty card">
            <Inbox size={18} />
            تکلیفی ثبت نشده است. از منو «تکالیف» را باز کن و اولین تکلیف را بساز.
          </div>
        ) : null}

        {assignments?.map((a) => (
          <section key={a.id} className="card sub-card">
            <header className="sub-card-head">
              <b>{a.title}</b>
              <span className={"status-pill" + (a.expired ? " late" : "")}>
                {a.expired ? "مهلت گذشته" : "باز"}
              </span>
            </header>
            <div className="deadline">
              مهلت: {fmtDeadline(a.deadline)} · {toFa(a.submissions.length)} ارسال
            </div>

            {a.submissions.length ? (
              <div className="sub-list">
                {a.submissions.map((s) => (
                  <div className="sub-row" key={s.id}>
                    <div className="sub-who">
                      <span className="sub-name">{s.name}</span>
                      <span className="sub-meta">
                        @{s.user} · {fmtDeadline(s.at)}
                      </span>
                      {s.note ? <span className="sub-note">{s.note}</span> : null}
                    </div>
                    <div className="sub-files">
                      <a
                        className="sub-file"
                        href={"/api/submissions/" + encodeURIComponent(s.id) + "/file"}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileText size={14} aria-hidden="true" />
                        {s.fileName}
                      </a>
                      {s.extraName ? (
                        <a
                          className="sub-file secondary"
                          href={
                            "/api/submissions/" + encodeURIComponent(s.id) + "/file?extra=1"
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Paperclip size={14} aria-hidden="true" />
                          {s.extraName}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">هنوز کسی این تکلیف را ارسال نکرده است.</div>
            )}
          </section>
        ))}
      </div>
        </>
      ) : null}
    </>
  );
}
