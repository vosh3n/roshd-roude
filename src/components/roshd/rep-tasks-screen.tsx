"use client";

/**
 * پنل نمایندهٔ آموزشی — تنها بخشی که این نقش به آن دسترسی دارد: تکالیف.
 * - ساخت، ویرایش و حذف تکلیف (عنوان، توضیح، مهلت، کلاس/رشته)
 * - دیدن همهٔ ارسال‌های دانش‌آموزان، باز کردن فایل/متن و ثبت نتیجه
 *   (تایید / برگشت برای اصلاح با دلیل + نمره و بازخورد)
 * - فیلتر بر اساس تکلیف، دانش‌آموز و وضعیت (ارسال‌نشده، در انتظار، تایید، اصلاح)
 * همهٔ دسترسی‌ها سمت سرور هم بررسی می‌شوند.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCheck,
  ClipboardList,
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { api, useRoshd } from "@/store/roshd";
import { fmtDeadline, toFa } from "@/lib/jalali";
import JalaliDateTimePicker from "./jalali-picker";
import EmptyState from "./empty-state";

type ReviewStatus = "pending" | "approved" | "revision";
type Filter = "all" | "missing" | ReviewStatus;

interface SubRow {
  id: string;
  user: string;
  name: string;
  fileName: string;
  extraName: string;
  note: string;
  status: ReviewStatus;
  feedback: string;
  grade: string;
  at: string;
}

interface AssignmentRow {
  id: string;
  title: string;
  body: string;
  audience: string;
  deadline: string;
  expired: boolean;
  submissions: SubRow[];
}

interface StudentRow {
  username: string;
  name: string;
}

const STATUS_TEXT: Record<Filter, string> = {
  all: "همه",
  missing: "ارسال‌نشده",
  pending: "در انتظار بررسی",
  approved: "تاییدشده",
  revision: "نیاز به اصلاح",
};

function reviewChip(status: ReviewStatus) {
  if (status === "approved") return "mission-chip approved";
  if (status === "revision") return "mission-chip revision";
  return "mission-chip pending";
}

export default function RepTasksScreen() {
  const pushToast = useRoshd((s) => s.pushToast);
  const serverUser = useRoshd((s) => s.serverUser);

  const [data, setData] = useState<{
    assignments: AssignmentRow[];
    students: StudentRow[];
  } | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"assignments" | "reviews">("assignments");

  /* ساخت تکلیف */
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);

  /* ویرایش تکلیف */
  const [editId, setEditId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eBody, setEBody] = useState("");
  const [eAudience, setEAudience] = useState("");
  const [eDeadline, setEDeadline] = useState("");

  /* بررسی ارسال */
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<Record<string, string>>({});
  const [reviewBusy, setReviewBusy] = useState<string | null>(null);

  /* فیلترها */
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<Filter>("pending");

  const load = useCallback(async () => {
    try {
      const d = await api("/api/admin/submissions");
      setData({
        assignments: d.assignments || [],
        students: d.students || [],
      });
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setData({ assignments: [], students: [] });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createTask = async () => {
    if (title.trim().length < 2) return pushToast("عنوان تکلیف را بنویس.");
    if (body.trim().length < 2) return pushToast("توضیح تکلیف را بنویس.");
    if (!deadline) return pushToast("مهلت تحویل را انتخاب کن.");
    setBusy(true);
    try {
      await api("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          audience,
          deadline,
        }),
      });
      setTitle("");
      setBody("");
      setAudience("");
      setDeadline("");
      pushToast("تکلیف ساخته شد.");
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (a: AssignmentRow) => {
    setEditId(a.id);
    setETitle(a.title);
    setEBody(a.body);
    setEAudience(a.audience);
    setEDeadline(a.deadline);
    setTab("assignments");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveEdit = async () => {
    if (!editId) return;
    if (eTitle.trim().length < 2) return pushToast("عنوان تکلیف را بنویس.");
    setBusy(true);
    try {
      await api("/api/assignments/" + encodeURIComponent(editId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: eTitle,
          body: eBody,
          audience: eAudience,
          deadline: eDeadline || undefined,
        }),
      });
      setEditId(null);
      pushToast("تکلیف ویرایش شد.");
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeTask = async (a: AssignmentRow) => {
    if (
      !window.confirm(
        `تکلیف «${a.title}» با ${toFa(a.submissions.length)} ارسال حذف شود؟ این کار برگشت‌پذیر نیست.`
      )
    )
      return;
    try {
      await api("/api/assignments/" + encodeURIComponent(a.id), {
        method: "DELETE",
      });
      pushToast("تکلیف حذف شد.");
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    }
  };

  const review = async (
    sub: SubRow,
    status: "approved" | "revision"
  ) => {
    const text = (feedback[sub.id] ?? sub.feedback ?? "").trim();
    if (status === "revision" && text.length < 3) {
      pushToast("برای برگشت دادن، دلیل را بنویس.");
      return;
    }
    setReviewBusy(sub.id);
    try {
      await api(
        "/api/admin/submissions/" + encodeURIComponent(sub.id) + "/review",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            feedback: text,
            grade: grade[sub.id] ?? sub.grade ?? "",
          }),
        }
      );
      pushToast(
        status === "approved" ? "ارسال تایید شد." : "برای اصلاح برگردانده شد."
      );
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setReviewBusy(null);
    }
  };

  /* ردیف‌های ترکیبی تکلیف × دانش‌آموز برای فیلتر «ارسال‌نشده» */
  const rows = useMemo(() => {
    if (!data) return [];
    const out: {
      assignment: AssignmentRow;
      student: StudentRow;
      sub: SubRow | null;
    }[] = [];
    for (const a of data.assignments) {
      if (assignmentFilter !== "all" && a.id !== assignmentFilter) continue;
      const byUser = new Map(a.submissions.map((s) => [s.user, s]));
      for (const st of data.students) {
        if (studentFilter !== "all" && st.username !== studentFilter) continue;
        const sub = byUser.get(st.username) || null;
        const status: Filter = sub ? sub.status : "missing";
        if (statusFilter !== "all" && status !== statusFilter) continue;
        out.push({ assignment: a, student: st, sub });
      }
    }
    return out;
  }, [data, assignmentFilter, studentFilter, statusFilter]);

  const counts = useMemo(() => {
    let pending = 0,
      approved = 0,
      revision = 0,
      missing = 0;
    if (data) {
      for (const a of data.assignments) {
        const byUser = new Map(a.submissions.map((s) => [s.user, s]));
        for (const st of data.students) {
          const s = byUser.get(st.username);
          if (!s) missing++;
          else if (s.status === "approved") approved++;
          else if (s.status === "revision") revision++;
          else pending++;
        }
      }
    }
    return { pending, approved, revision, missing };
  }, [data]);

  return (
    <div className="rep-wrap" dir="rtl">
      <div className="page-head">
        <h2 className="section-title">تکالیف کلاس</h2>
        <p className="note">
          {serverUser?.name ? `${serverUser.name} — ` : ""}
          ساخت و ویرایش تکلیف، و بررسی ارسال‌های دانش‌آموزان.
        </p>
      </div>

      <div className="parent-tabs admin-tabs" role="tablist" aria-label="بخش‌های تکالیف">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "assignments"}
          className={"parent-tab" + (tab === "assignments" ? " active" : "")}
          onClick={() => setTab("assignments")}
        >
          <ClipboardList size={16} /> تکالیف
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "reviews"}
          className={"parent-tab" + (tab === "reviews" ? " active" : "")}
          onClick={() => setTab("reviews")}
        >
          <CheckCheck size={16} /> ارسال‌ها
          {counts.pending > 0 ? (
            <span className="drawer-badge">{toFa(counts.pending)}</span>
          ) : null}
        </button>
      </div>

      {error ? <div className="empty card">{error}</div> : null}

      {data === null ? (
        <div className="calm-loading">
          <Loader2 size={18} className="spin" /> در حال خواندن…
        </div>
      ) : null}

      {/* ---------------- تکالیف ---------------- */}
      {data && tab === "assignments" ? (
        <>
          <div className="card admin-card">
            <h3 className="gallery-title">
              {editId ? <Pencil size={17} /> : <Plus size={17} />}
              {editId ? "ویرایش تکلیف" : "تکلیف تازه"}
            </h3>
            <div className="admin-form">
              <label className="mission-field">
                <span>عنوان</span>
                <input
                  type="text"
                  maxLength={160}
                  value={editId ? eTitle : title}
                  onChange={(e) =>
                    editId ? setETitle(e.target.value) : setTitle(e.target.value)
                  }
                />
              </label>
              <label className="mission-field">
                <span>توضیح تکلیف</span>
                <textarea
                  rows={3}
                  maxLength={4000}
                  value={editId ? eBody : body}
                  onChange={(e) =>
                    editId ? setEBody(e.target.value) : setBody(e.target.value)
                  }
                />
              </label>
              <label className="mission-field">
                <span>کلاس یا رشته/سطح مربوط (اختیاری)</span>
                <input
                  type="text"
                  maxLength={80}
                  placeholder="مثلاً: کلاس ۹۰۱ یا گرافیک — متوسط"
                  value={editId ? eAudience : audience}
                  onChange={(e) =>
                    editId
                      ? setEAudience(e.target.value)
                      : setAudience(e.target.value)
                  }
                />
              </label>
              <div className="mission-field">
                <span>مهلت تحویل</span>
                <JalaliDateTimePicker
                  idPrefix={editId ? "repEditDp" : "repNewDp"}
                  initial={editId ? new Date(eDeadline) : undefined}
                  onChange={editId ? setEDeadline : setDeadline}
                />
              </div>
              <div className="admin-row-actions">
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={editId ? saveEdit : createTask}
                >
                  {busy ? (
                    <Loader2 size={16} className="spin" />
                  ) : editId ? (
                    <Save size={16} />
                  ) : (
                    <Plus size={16} />
                  )}
                  {editId ? "ذخیرهٔ تغییر" : "ساخت تکلیف"}
                </button>
                {editId ? (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setEditId(null)}
                  >
                    انصراف
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {data.assignments.length === 0 ? (
            <EmptyState
              title="هنوز تکلیفی ساخته نشده"
              hint="با فرم بالا اولین تکلیف کلاس را بساز."
              icon={<ClipboardList size={26} />}
            />
          ) : (
            <div className="rep-assignments">
              {data.assignments.map((a) => (
                <article key={a.id} className="card rep-assignment">
                  <header className="rep-assignment-head">
                    <b>{a.title}</b>
                    <span className={"status-pill" + (a.expired ? " late" : "")}>
                      {a.expired ? "مهلت گذشته" : "باز"}
                    </span>
                  </header>
                  {a.audience ? (
                    <span className="sa-chip">{a.audience}</span>
                  ) : null}
                  <p className="rep-assignment-body">{a.body}</p>
                  <div className="rep-assignment-foot">
                    <span>مهلت: {fmtDeadline(a.deadline)}</span>
                    <span>{toFa(a.submissions.length)} ارسال</span>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="iconbtn"
                        aria-label="ویرایش تکلیف"
                        onClick={() => startEdit(a)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="iconbtn danger"
                        aria-label="حذف تکلیف"
                        onClick={() => removeTask(a)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : null}

      {/* ---------------- ارسال‌ها ---------------- */}
      {data && tab === "reviews" ? (
        <>
          <div className="card rep-filters">
            <label className="sa-mini">
              <span>تکلیف</span>
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value)}
              >
                <option value="all">همهٔ تکالیف</option>
                {data.assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="sa-mini">
              <span>دانش‌آموز</span>
              <select
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
              >
                <option value="all">همهٔ دانش‌آموزان</option>
                {data.students.map((s) => (
                  <option key={s.username} value={s.username}>
                    {s.name} (@{s.username})
                  </option>
                ))}
              </select>
            </label>
            <label className="sa-mini">
              <span>وضعیت</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Filter)}
              >
                {(
                  ["pending", "approved", "revision", "missing", "all"] as Filter[]
                ).map((f) => (
                  <option key={f} value={f}>
                    {STATUS_TEXT[f]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="note rep-counts">
            در انتظار: {toFa(counts.pending)} · تاییدشده: {toFa(counts.approved)} ·
            نیاز به اصلاح: {toFa(counts.revision)} · ارسال‌نشده:{" "}
            {toFa(counts.missing)}
          </p>

          {rows.length === 0 ? (
            <EmptyState
              title="موردی با این فیلتر نیست"
              hint="فیلتر را عوض کن یا منتظر ارسال تازه بمان."
              icon={<ClipboardList size={26} />}
            />
          ) : (
            <div className="rep-reviews">
              {rows.map(({ assignment, student, sub }) => (
                <article
                  key={assignment.id + ":" + student.username}
                  className="card rep-review"
                >
                  <header className="rep-review-head">
                    <b>{student.name}</b>
                    <small>
                      @{student.username} · {assignment.title}
                    </small>
                    <span
                      className={
                        sub ? reviewChip(sub.status) : "mission-chip missing"
                      }
                    >
                      {sub ? STATUS_TEXT[sub.status] : "ارسال نشده"}
                    </span>
                  </header>

                  {sub ? (
                    <>
                      <div className="rep-review-meta">
                        <span>ارسال: {fmtDeadline(sub.at)}</span>
                        {sub.grade ? <span>نمرهٔ ثبت‌شده: {sub.grade}</span> : null}
                      </div>
                      {sub.note ? <p className="rep-review-note">{sub.note}</p> : null}
                      <div className="sub-files">
                        <a
                          className="sub-file"
                          href={
                            "/api/submissions/" +
                            encodeURIComponent(sub.id) +
                            "/file"
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileText size={14} /> {sub.fileName}
                        </a>
                        {sub.extraName ? (
                          <a
                            className="sub-file secondary"
                            href={
                              "/api/submissions/" +
                              encodeURIComponent(sub.id) +
                              "/file?extra=1"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Paperclip size={14} /> {sub.extraName}
                          </a>
                        ) : null}
                      </div>

                      {sub.feedback ? (
                        <div className="msg-reply">
                          <b>بازخورد ثبت‌شده</b>
                          <p>{sub.feedback}</p>
                        </div>
                      ) : null}

                      <div className="rep-review-form">
                        <label className="mission-field">
                          <span>بازخورد یا دلیل برگشت</span>
                          <textarea
                            rows={2}
                            maxLength={1000}
                            value={feedback[sub.id] ?? sub.feedback}
                            placeholder="کوتاه و روشن بنویس…"
                            onChange={(e) =>
                              setFeedback((f) => ({
                                ...f,
                                [sub.id]: e.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="mission-field rep-grade">
                          <span>نمره (اختیاری)</span>
                          <input
                            type="text"
                            maxLength={20}
                            value={grade[sub.id] ?? sub.grade}
                            placeholder="مثلاً ۱۸"
                            onChange={(e) =>
                              setGrade((g) => ({
                                ...g,
                                [sub.id]: e.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="btn"
                          disabled={reviewBusy === sub.id}
                          onClick={() => review(sub, "approved")}
                        >
                          {reviewBusy === sub.id ? (
                            <Loader2 size={15} className="spin" />
                          ) : (
                            <CheckCheck size={15} />
                          )}
                          تایید
                        </button>
                        <button
                          type="button"
                          className="btn secondary"
                          disabled={reviewBusy === sub.id}
                          onClick={() => review(sub, "revision")}
                        >
                          <RotateCcw size={15} />
                          برگشت برای اصلاح
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="note rep-missing">
                      این دانش‌آموز هنوز چیزی برای این تکلیف نفرستاده است.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
