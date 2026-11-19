"use client";

import { useCallback, useEffect, useState } from "react";
import { useRoshd, api } from "@/store/roshd";
import { fmtDeadline } from "@/lib/jalali";
import JalaliDateTimePicker from "./jalali-picker";

interface Assignment {
  id: string;
  title: string;
  body: string;
  deadline: string;
  expired: boolean;
  mine: {
    fileName: string;
    note?: string;
    at: string;
  } | null;
}

interface AllowItem {
  username: string;
  name: string;
  joined: boolean;
}

function past(iso: string) {
  return Date.now() > new Date(iso).getTime();
}

export default function TasksScreen() {
  const serverUser = useRoshd((s) => s.serverUser);
  const pushToast = useRoshd((s) => s.pushToast);
  const bindServerUser = useRoshd((s) => s.bindServerUser);
  const isAdmin =
    serverUser?.role === "admin" || serverUser?.role === "superadmin";

  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [role, setRole] = useState<string>(serverUser?.role || "student");
  const [allowList, setAllowList] = useState<AllowItem[] | null>(null);
  const [error, setError] = useState("");

  // فرم ساخت تکلیف
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deadline, setDeadline] = useState("");
  const [taskError, setTaskError] = useState("");
  const [creating, setCreating] = useState(false);

  // فرم دسترسی معلم
  const [allowUser, setAllowUser] = useState("");

  // ارسال پاسخ
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [subFile, setSubFile] = useState<Record<string, File | null>>({});
  const [subExtra, setSubExtra] = useState<Record<string, File | null>>({});
  const [subNote, setSubNote] = useState<Record<string, string>>({});
  const [subError, setSubError] = useState<Record<string, string>>({});

  // تغییر مهلت
  const [deadlineEdits, setDeadlineEdits] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    const jobs: Promise<any>[] = [api("/api/assignments")];
    if (isAdmin) jobs.push(api("/api/admin/allowlist"));
    Promise.all(jobs)
      .then(([d, allow]) => {
        if (serverUser) {
          // نقش ممکن است تغییر کرده باشد
          setRole(d.role);
          if (d.role !== serverUser.role) {
            bindServerUser({ ...serverUser, role: d.role });
          }
        }
        setAssignments(d.assignments);
        if (allow) setAllowList(allow.usernames);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [isAdmin, serverUser, bindServerUser]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);

  const createTask = async () => {
    setTaskError("");
    if (!deadline) {
      setTaskError("تاریخ مهلت را مشخص کن.");
      return;
    }
    setCreating(true);
    try {
      await api("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, deadline }),
      });
      setTitle("");
      setBody("");
      load();
    } catch (e: any) {
      setTaskError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const setAdminAccess = async (grant: boolean) => {
    const username = allowUser.trim();
    try {
      await api("/api/admin/allow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, grant }),
      });
      setAllowUser("");
      pushToast(grant ? "دسترسی معلم ثبت شد" : "دسترسی معلم برداشته شد");
      load();
      if (serverUser && serverUser.username === username) {
        const d = await api("/api/auth/me");
        bindServerUser(d.user);
      }
    } catch (e: any) {
      pushToast(e.message);
    }
  };

  const changeDeadline = async (id: string) => {
    const value = deadlineEdits[id];
    if (!value) {
      pushToast("اول تاریخ جدید را انتخاب کن.");
      return;
    }
    try {
      await api("/api/assignments/" + encodeURIComponent(id) + "/deadline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadline: value }),
      });
      load();
    } catch (e: any) {
      pushToast(e.message);
    }
  };

  const submitTask = async (a: Assignment) => {
    const err = { ...subError };
    err[a.id] = "";
    setSubError(err);
    const file = subFile[a.id];
    const extra = subExtra[a.id];
    const note = subNote[a.id] || "";
    if (!file) {
      err[a.id] = "یک فایل برای پاسخ انتخاب کن.";
      setSubError(err);
      return;
    }
    if (file.size > 100 * 1024 * 1024 || (extra && extra.size > 100 * 1024 * 1024)) {
      err[a.id] = "حداکثر حجم هر فایل ۱۰۰ مگابایت است.";
      setSubError(err);
      return;
    }
    setSubmitting(a.id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("note", note);
      if (extra) fd.append("extra", extra);
      await api("/api/assignments/" + encodeURIComponent(a.id) + "/submit", {
        method: "POST",
        body: fd,
      });
      pushToast("تکلیف ارسال شد");
      load();
    } catch (e: any) {
      err[a.id] = e.message;
      setSubError(err);
      load();
    } finally {
      setSubmitting(null);
    }
  };

  // معلم و مدیر سایت هر دو ابزار ساخت تکلیف را دارند
  const adminMode = isAdmin && (role === "admin" || role === "superadmin");

  return (
    <>
      <h2 className="section-title">تکالیف</h2>

      {adminMode ? (
        <div className="card" style={{ padding: "1.125rem", marginBottom: "1rem" }} id="taskAdmin">
          <div className="field-group">
            <label htmlFor="taskTitle">عنوان</label>
            <input
              id="taskTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label htmlFor="taskBody">توضیحات</label>
            <textarea
              id="taskBody"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div id="taskDeadline">
            <div className="field-group">
              <label>تاریخ و ساعت مهلت</label>
              <JalaliDateTimePicker idPrefix="taskdp" onChange={setDeadline} />
            </div>
          </div>
          <button className="btn" type="button" onClick={createTask} disabled={creating}>
            {creating ? "در حال ساخت…" : "ساخت تکلیف"}
          </button>
          <div className="error-msg" id="taskError" role="alert">
            {taskError}
          </div>
        </div>
      ) : null}

      {adminMode ? (
        <div className="card" style={{ padding: "1.125rem", marginBottom: "1rem" }} id="adminPeople">
          <div className="field-group">
            <label htmlFor="allowUser">نام کاربری حساب معلم</label>
            <input
              id="allowUser"
              type="text"
              placeholder="username"
              value={allowUser}
              onChange={(e) => setAllowUser(e.target.value)}
              dir="ltr"
            />
          </div>
          <button className="btn" type="button" onClick={() => setAdminAccess(true)}>
            دادن دسترسی معلم
          </button>{" "}
          <button className="btn secondary" type="button" onClick={() => setAdminAccess(false)}>
            گرفتن دسترسی
          </button>
          <div className="note" id="allowList">
            {allowList
              ? allowList.length
                ? "مجازها: " + allowList.map((u) => u.username).join("، ")
                : "هنوز نام کاربری مجازی ثبت نشده."
              : ""}
          </div>
        </div>
      ) : null}

      <div id="taskList" style={{ marginTop: "1rem" }}>
        {error ? <div className="empty card">{error}</div> : null}
        {!error && assignments === null ? <div className="empty">در حال بارگذاری…</div> : null}
        {assignments && assignments.length === 0 ? (
          <div className="empty card">تکلیفی ثبت نشده است.</div>
        ) : null}
        {assignments?.map((a) => {
          const late = a.expired || past(a.deadline);
          return (
            <div key={a.id} className={"card task-card" + (late ? " expired" : "")}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.625rem",
                  alignItems: "center",
                }}
              >
                <b>{a.title}</b>
                <span className={"status-pill" + (late ? " late" : "")}>
                  {late ? "مهلت گذشته" : "باز"}
                </span>
              </div>
              <p className="note" style={{ whiteSpace: "pre-wrap" }}>
                {a.body}
              </p>
              <div className={"deadline" + (late ? " late" : "")}>
                مهلت: {fmtDeadline(a.deadline)}
              </div>

              {adminMode ? (
                <div className="new-deadline">
                  <div className="field-group" style={{ marginBottom: "0.5rem" }}>
                    <label>مهلت جدید</label>
                    <JalaliDateTimePicker
                      idPrefix={"dl" + a.id}
                      initial={new Date(a.deadline)}
                      onChange={(iso) =>
                        setDeadlineEdits((edits) => ({ ...edits, [a.id]: iso }))
                      }
                    />
                  </div>
                  <button className="btn secondary" type="button" onClick={() => changeDeadline(a.id)}>
                    ثبت مهلت
                  </button>
                </div>
              ) : late ? (
                <p className="deadline late">
                  مهلت ارسال این تکلیف گذشته است و امکان بارگذاری وجود ندارد.
                  {a.mine ? " فایل شما: " + a.mine.fileName : ""}
                </p>
              ) : a.mine ? (
                <p className="note">
                  ارسال شده در {fmtDeadline(a.mine.at)}: {a.mine.fileName}
                  {a.mine.note ? " — " + a.mine.note : ""}
                </p>
              ) : (
                <div>
                  <div className="field-group">
                    <label>فایل پاسخ (حداکثر ۱۰۰ مگابایت)</label>
                    <input
                      type="file"
                      aria-label="فایل پاسخ"
                      onChange={(e) =>
                        setSubFile((f) => ({ ...f, [a.id]: e.target.files?.[0] || null }))
                      }
                    />
                  </div>
                  <div className="field-group">
                    <label>توضیح اضافه (اختیاری)</label>
                    <textarea
                      rows={3}
                      aria-label="توضیح اضافه"
                      value={subNote[a.id] || ""}
                      onChange={(e) => setSubNote((n) => ({ ...n, [a.id]: e.target.value }))}
                    />
                  </div>
                  <div className="field-group">
                    <label>فایل تکمیلی (اختیاری)</label>
                    <input
                      type="file"
                      aria-label="فایل تکمیلی"
                      onChange={(e) =>
                        setSubExtra((f) => ({ ...f, [a.id]: e.target.files?.[0] || null }))
                      }
                    />
                  </div>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => submitTask(a)}
                    disabled={submitting === a.id}
                  >
                    {submitting === a.id ? "در حال ارسال…" : "ارسال"}
                  </button>
                  <div className="error-msg" role="alert">
                    {subError[a.id] || ""}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
