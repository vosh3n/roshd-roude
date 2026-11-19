"use client";

/**
 * مدیریت نماینده‌های آموزشی — فقط در پنل مدیر سایت (بخش «دانش‌آموزان و حساب‌ها»)
 * فهرست (نام، نام کاربری، کلاس، وضعیت)، ساخت نمایندهٔ جدید، فعال/غیرفعال،
 * ریست رمز و حذف حساب. ساخت این نقش از هیچ راه دیگری ممکن نیست.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Power, RotateCcw, Trash2, UserPlus } from "lucide-react";
import { api, useRoshd } from "@/store/roshd";
import { fmtDeadline, toFa } from "@/lib/jalali";
import EmptyState from "./empty-state";

interface RepRow {
  username: string;
  name: string;
  email: string;
  classId: string;
  className: string;
  active: boolean;
  createdAt: string;
}

interface ClassOption {
  id: string;
  name: string;
  active: boolean;
}

export default function RepsAdmin() {
  const pushToast = useRoshd((s) => s.pushToast);
  const [rows, setRows] = useState<RepRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repClass, setRepClass] = useState("");

  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [classList, setClassList] = useState<ClassOption[]>([]);

  const load = useCallback(async () => {
    try {
      const d = await api("/api/admin/reps");
      setRows(d.reps || []);
      setClassList(d.classes || []);
    } catch (e) {
      pushToast((e as Error).message);
      setRows([]);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (name.trim().length < 2) return pushToast("نام نماینده را بنویس.");
    if (username.trim().length < 3) return pushToast("نام کاربری را بنویس.");
    if (password.length < 5) return pushToast("رمز موقت حداقل ۵ نویسه باشد.");
    setBusy("new");
    try {
      await api("/api/admin/reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password, classId: repClass }),
      });
      setName("");
      setUsername("");
      setPassword("");
      setRepClass("");
      pushToast("حساب نمایندهٔ آموزشی ساخته شد.");
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const patch = async (u: string, body: Record<string, unknown>, msg: string) => {
    setBusy(u);
    try {
      await api("/api/admin/reps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, ...body }),
      });
      pushToast(msg);
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const resetPassword = async (r: RepRow) => {
    const next = passwords[r.username] || "";
    if (next.length < 5) return pushToast("رمز جدید حداقل ۵ نویسه باشد.");
    await patch(r.username, { password: next }, `رمز «${r.name}» عوض شد.`);
    setPasswords((p) => ({ ...p, [r.username]: "" }));
  };

  const remove = async (r: RepRow) => {
    if (!window.confirm(`حساب نمایندهٔ «${r.name}» حذف شود؟`)) return;
    setBusy(r.username);
    try {
      await api("/api/admin/reps?username=" + encodeURIComponent(r.username), {
        method: "DELETE",
      });
      pushToast("حساب نماینده حذف شد.");
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="reps-admin">
      <div className="card admin-card">
        <h3 className="gallery-title">
          <UserPlus size={17} /> نمایندهٔ آموزشی تازه
        </h3>
        <p className="note">
          نمایندهٔ آموزشی فقط به تکالیف کلاس دسترسی دارد: ساخت و ویرایش تکلیف و
          بررسی ارسال‌ها.
        </p>
        <div className="admin-form">
          <div className="admin-form-row">
            <label className="mission-field">
              <span>نام نمایشی</span>
              <input
                type="text"
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="mission-field">
              <span>نام کاربری (انگلیسی)</span>
              <input
                type="text"
                dir="ltr"
                maxLength={32}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="rep_901"
              />
            </label>
          </div>
          <div className="admin-form-row">
            <label className="mission-field">
              <span>رمز موقت</span>
              <input
                type="text"
                dir="ltr"
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="حداقل ۵ نویسه"
              />
            </label>
            <label className="mission-field">
              <span>کلاس مسئولیت (اختیاری)</span>
              <select
                value={repClass}
                onChange={(e) => setRepClass(e.target.value)}
              >
                <option value="">— بدون کلاس —</option>
                {classList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.active ? "" : " (غیرفعال)"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="button" className="btn" disabled={busy === "new"} onClick={create}>
            {busy === "new" ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Plus size={16} />
            )}
            ساخت حساب نماینده
          </button>
        </div>
      </div>

      {rows === null ? (
        <div className="calm-loading">
          <Loader2 size={18} className="spin" /> در حال خواندن…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="هنوز نماینده‌ای ساخته نشده"
          hint="برای هر کلاس یک نمایندهٔ آموزشی بساز تا تکالیف را مدیریت کند."
          icon={<UserPlus size={26} />}
        />
      ) : (
        <div className="sa-student-list">
          {rows.map((r) => (
            <article key={r.username} className="card sa-student">
              <header className="sa-student-head">
                <span className="sa-student-avatar" aria-hidden="true">
                  <img src="/emoji/1f4cb.png" alt="" />
                </span>
                <div className="sa-student-id">
                  <b>{r.name}</b>
                  <small>@{r.username}</small>
                </div>
                <div className="sa-student-chips">
                  <span className="sa-chip">{r.className || "بدون کلاس"}</span>
                  <span className={"sa-chip " + (r.active ? "on" : "off")}>
                    {r.active ? "فعال" : "غیرفعال"}
                  </span>
                </div>
              </header>

              <div className="sa-student-stats">
                <span className="sa-student-joined">
                  ساخته‌شده در {fmtDeadline(r.createdAt)}
                </span>
              </div>

              <div className="sa-student-actions">
                <label className="sa-mini">
                  <span>کلاس مسئولیت</span>
                  <select
                    value={r.classId}
                    disabled={busy === r.username}
                    onChange={(e) =>
                      patch(r.username, { classId: e.target.value }, "کلاس نماینده ذخیره شد.")
                    }
                    aria-label={`کلاس ${r.name}`}
                  >
                    <option value="">— بدون کلاس —</option>
                    {classList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.active ? "" : " (غیرفعال)"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="sa-mini">
                  <span>رمز جدید</span>
                  <span className="sa-inline">
                    <input
                      type="password"
                      maxLength={72}
                      placeholder="حداقل ۵ نویسه"
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
                      className="iconbtn"
                      aria-label="ریست رمز"
                      disabled={busy === r.username}
                      onClick={() => resetPassword(r)}
                    >
                      <RotateCcw size={15} />
                    </button>
                  </span>
                </label>

                <button
                  type="button"
                  className="btn secondary"
                  disabled={busy === r.username}
                  onClick={() =>
                    patch(
                      r.username,
                      { active: !r.active },
                      r.active ? "حساب غیرفعال شد." : "حساب فعال شد."
                    )
                  }
                >
                  <Power size={15} />
                  {r.active ? "غیرفعال کردن" : "فعال کردن"}
                </button>

                <button
                  type="button"
                  className="iconbtn danger sa-student-del"
                  aria-label={`حذف حساب ${r.name}`}
                  disabled={busy === r.username}
                  onClick={() => remove(r)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="note reps-count">
        {rows === null ? "" : `${toFa(rows.length)} نمایندهٔ آموزشی`}
      </p>
    </div>
  );
}
