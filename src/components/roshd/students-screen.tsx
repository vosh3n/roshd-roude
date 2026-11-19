"use client";

/**
 * بخش دانش‌آموزان در پنل مدیر سایت
 * - فهرست حساب‌ها و وضعیت درسی (رشته، سطح، ماموریت تاییدشده، تکالیف)
 * - اتصال هر دانش‌آموز به والد
 * - تغییر نام، بازنشانی رمز و حذف حساب
 * همهٔ این کارها در API سمت سرور هم با نقش superadmin کنترل می‌شوند.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, useRoshd } from "@/store/roshd";
import { LEVELS } from "@/lib/missions-data";
import { fmtDeadline, toFa } from "@/lib/jalali";
import {
  GraduationCap,
  Layers,
  Loader2,
  Save,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import EmptyState from "./empty-state";
import RepsAdmin from "./reps-admin";
import ClassesAdmin from "./classes-admin";

interface StudentRow {
  username: string;
  name: string;
  email: string;
  field: string;
  level: string;
  parentUsername: string;
  parentName: string;
  classId: string;
  className: string;
  approved: number;
  pending: number;
  tasks: number;
  createdAt: string;
}

interface ParentRow {
  username: string;
  name: string;
}

const FIELD_NAMES: Record<string, string> = {
  computer: "کامپیوتر",
  animation: "انیمیشن",
  graphic: "گرافیک",
  tv: "تلویزیون",
};

export default function StudentsScreen() {
  const pushToast = useRoshd((s) => s.pushToast);
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [parents, setParents] = useState<ParentRow[]>([]);
    const [q, setQ] = useState("");

  const [tab, setTab] = useState<"students" | "reps" | "classes">("students");
  const [classes, setClasses] = useState<{ id: string; name: string; active: boolean }[]>([]);

  const [busy, setBusy] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [d, cls] = await Promise.all([
        api("/api/admin/students"),
        api("/api/admin/classes").catch(() => ({ classes: [] })),
      ]);
      setRows(d.students || []);
      setParents(d.parents || []);
      setClasses(cls.classes || []);
    } catch (e) {
      pushToast((e as Error).message);
      setRows([]);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.username.toLowerCase().includes(s) ||
        (r.parentName || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  const patch = async (username: string, body: Record<string, unknown>) => {
    setBusy(username);
    try {
      await api("/api/admin/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, ...body }),
      });
      await load();
      return true;
    } catch (e) {
      pushToast((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const saveName = async (r: StudentRow) => {
    const name = (names[r.username] ?? r.name).trim();
    if (name === r.name) return;
    if (await patch(r.username, { name })) pushToast("نام ذخیره شد.");
  };

  const setPassword = async (r: StudentRow) => {
    const password = passwords[r.username] || "";
    if (password.length < 6) {
      pushToast("رمز جدید باید حداقل ۶ نویسه باشد.");
      return;
    }
    if (await patch(r.username, { password })) {
      setPasswords((p) => ({ ...p, [r.username]: "" }));
      pushToast(`رمز «${r.name}» عوض شد.`);
    }
  };

  const moveClass = async (r: StudentRow, classId: string) => {
    if (await patch(r.username, { classId }))
      pushToast(classId ? "دانش‌آموز به کلاس منتقل شد." : "دانش‌آموز «بدون کلاس» شد.");
  };

  const linkParent = async (r: StudentRow, parentUsername: string) => {
    if (await patch(r.username, { parentUsername }))
      pushToast(
        parentUsername ? "دانش‌آموز به والد وصل شد." : "اتصال والد قطع شد."
      );
  };

  const remove = async (r: StudentRow) => {
    if (
      !window.confirm(
        `حساب «${r.name}» و همهٔ پیشرفت و ارسال‌هایش حذف شود؟ این کار برگشت‌پذیر نیست.`
      )
    )
      return;
    setBusy(r.username);
    try {
      await api(
        "/api/admin/students?username=" + encodeURIComponent(r.username),
        { method: "DELETE" }
      );
      pushToast("حساب دانش‌آموز حذف شد.");
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="sa-students" dir="rtl">
      <div className="page-head">
        <h2 className="section-title">دانش‌آموزان</h2>
        <p className="note">
          {rows === null
            ? "در حال خواندن حساب‌ها…"
            : `${toFa(rows.length)} حساب دانش‌آموزی — وضعیت، والد، رمز و حذف حساب.`}
        </p>
      </div>

      <div
        className="parent-tabs admin-tabs"
        role="tablist"
        aria-label="بخش‌های حساب‌ها"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "students"}
          className={"parent-tab" + (tab === "students" ? " active" : "")}
          onClick={() => setTab("students")}
        >
          <UserRound size={16} /> دانش‌آموزان
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "classes"}
          className={"parent-tab" + (tab === "classes" ? " active" : "")}
          onClick={() => setTab("classes")}
        >
          <Layers size={16} /> کلاس‌ها
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "reps"}
          className={"parent-tab" + (tab === "reps" ? " active" : "")}
          onClick={() => setTab("reps")}
        >
          <GraduationCap size={16} /> نماینده‌های آموزشی
        </button>
      </div>

      {tab === "classes" ? <ClassesAdmin /> : null}
      {tab === "reps" ? <RepsAdmin /> : null}
      {tab === "students" ? <>
      <label className="sa-search">
        <Search size={16} />
        <input
          type="search"
          placeholder="جستجو با نام، نام کاربری یا والد…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>

      {rows === null ? (
        <div className="calm-loading">
          <Loader2 size={18} className="spin" /> در حال خواندن…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="دانش‌آموزی پیدا نشد"
          hint="با ثبت‌نام در سایت، حساب دانش‌آموز ساخته می‌شود."
          icon={<UserRound size={26} />}
        />
      ) : (
        <div className="sa-student-list">
          {filtered.map((r) => (
            <article key={r.username} className="card sa-student">
              <header className="sa-student-head">
                <span className="sa-student-avatar" aria-hidden="true">
                  <img src="/emoji/1f393.png" alt="" />
                </span>
                <div className="sa-student-id">
                  <b>{r.name}</b>
                  <small>
                    @{r.username}
                    {r.email ? " · " + r.email : ""}
                  </small>
                </div>
                <div className="sa-student-chips">
                  <span className="sa-chip">
                    {FIELD_NAMES[r.field] || "بدون رشته"}
                  </span>
                  <span className="sa-chip">
                    {LEVELS[r.level] || "بدون سطح"}
                  </span>
                  <span className="sa-chip class">
                    {r.className || "بدون کلاس"}
                  </span>
                </div>
              </header>

              <div className="sa-student-stats">
                <span>
                  <b>{toFa(r.approved)}</b> ماموریت تاییدشده
                </span>
                <span>
                  <b>{toFa(r.pending)}</b> در انتظار بررسی
                </span>
                <span>
                  <b>{toFa(r.tasks)}</b> تکلیف ارسالی
                </span>
                <span className="sa-student-joined">
                  عضو از {fmtDeadline(r.createdAt)}
                </span>
              </div>

              <div className="sa-student-actions">
                <label className="sa-mini">
                  <span>کلاس</span>
                  <select
                    value={r.classId}
                    disabled={busy === r.username}
                    onChange={(e) => moveClass(r, e.target.value)}
                    aria-label={`کلاس ${r.name}`}
                  >
                    <option value="">— بدون کلاس —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.active ? "" : " (غیرفعال)"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="sa-mini">
                  <span>والد</span>
                  <select
                    value={r.parentUsername}
                    disabled={busy === r.username}
                    onChange={(e) => linkParent(r, e.target.value)}
                    aria-label={`والد ${r.name}`}
                  >
                    <option value="">— بدون والد —</option>
                    {parents.map((p) => (
                      <option key={p.username} value={p.username}>
                        {p.name} (@{p.username})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="sa-mini">
                  <span>نام نمایشی</span>
                  <span className="sa-inline">
                    <input
                      type="text"
                      value={names[r.username] ?? r.name}
                      maxLength={80}
                      onChange={(e) =>
                        setNames((n) => ({ ...n, [r.username]: e.target.value }))
                      }
                      aria-label={`نام ${r.name}`}
                    />
                    <button
                      type="button"
                      className="iconbtn"
                      aria-label="ذخیرهٔ نام"
                      disabled={busy === r.username}
                      onClick={() => saveName(r)}
                    >
                      <Save size={15} />
                    </button>
                  </span>
                </label>

                <label className="sa-mini">
                  <span>رمز جدید</span>
                  <span className="sa-inline">
                    <input
                      type="password"
                      placeholder="حداقل ۶ نویسه"
                      value={passwords[r.username] || ""}
                      onChange={(e) =>
                        setPasswords((p) => ({
                          ...p,
                          [r.username]: e.target.value,
                        }))
                      }
                      aria-label={`رمز جدید ${r.name}`}
                    />
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={busy === r.username}
                      onClick={() => setPassword(r)}
                    >
                      ثبت
                    </button>
                  </span>
                </label>

                <button
                  type="button"
                  className="iconbtn danger sa-student-del"
                  aria-label={`حذف حساب ${r.name}`}
                  disabled={busy === r.username}
                  onClick={() => remove(r)}
                >
                  {busy === r.username ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      </> : null}
    </div>
  );
}
