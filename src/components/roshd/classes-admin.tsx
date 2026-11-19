"use client";

/**
 * مدیریت کلاس‌ها در بخش «دانش‌آموزان و حساب‌ها» — فقط مدیر سایت
 * ساخت/ویرایش/فعال‌وبازفعال کردن کلاس و تعیین نمایندهٔ هر کلاس.
 */

import { useCallback, useEffect, useState } from "react";
import { api, useRoshd } from "@/store/roshd";
import { toFa } from "@/lib/jalali";
import {
  GraduationCap,
  Loader2,
  Plus,
  Save,
  UserRound,
} from "lucide-react";
import EmptyState from "./empty-state";

interface ClassRow {
  id: string;
  name: string;
  year: string;
  active: boolean;
  repUsername: string;
  repName: string;
  studentCount: number;
  assignmentCount: number;
}
interface RepRow {
  username: string;
  name: string;
  active: boolean;
}

export default function ClassesAdmin() {
  const pushToast = useRoshd((s) => s.pushToast);
  const [rows, setRows] = useState<ClassRow[] | null>(null);
  const [reps, setReps] = useState<RepRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newYear, setNewYear] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api("/api/admin/classes");
      setRows(d.classes || []);
      setReps(d.reps || []);
    } catch (e) {
      pushToast((e as Error).message);
      setRows([]);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (newName.trim().length < 2) {
      pushToast("نام کلاس را بنویس.");
      return;
    }
    setBusy("new");
    try {
      await api("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), year: newYear.trim() }),
      });
      setNewName("");
      setNewYear("");
      pushToast("کلاس ساخته شد.");
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy(id);
    try {
      await api("/api/admin/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
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

  return (
    <div className="sa-classes">
      <div className="card cls-new">
        <h3 className="gallery-title">
          <Plus size={17} /> کلاس تازه
        </h3>
        <div className="cls-new-row">
          <label className="mission-field">
            <span>نام کلاس</span>
            <input
              type="text"
              maxLength={60}
              placeholder="مثلاً کلاس ۲"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </label>
          <label className="mission-field">
            <span>سال / گروه (اختیاری)</span>
            <input
              type="text"
              maxLength={20}
              placeholder="مثلاً ۱۴۰۵ یا گروه الف"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn"
            onClick={create}
            disabled={busy === "new"}
          >
            {busy === "new" ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Plus size={16} />
            )}
            ساخت کلاس
          </button>
        </div>
      </div>

      {rows === null ? (
        <div className="calm-loading">
          <Loader2 size={18} className="spin" /> در حال خواندن کلاس‌ها…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="هنوز کلاسی ساخته نشده"
          hint="اولین کلاس را بساز؛ بعد دانش‌آموزان را به آن منتقل کن و نماینده‌اش را انتخاب کن."
          icon={<GraduationCap size={26} />}
        />
      ) : (
        <div className="cls-list">
          {rows.map((c) => (
            <ClassCard
              key={c.id}
              row={c}
              reps={reps}
              busy={busy === c.id}
              onPatch={(body) => patch(c.id, body)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassCard({
  row,
  reps,
  busy,
  onPatch,
}: {
  row: ClassRow;
  reps: RepRow[];
  busy: boolean;
  onPatch: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const pushToast = useRoshd((s) => s.pushToast);
  const [name, setName] = useState(row.name);
  const [year, setYear] = useState(row.year);

  useEffect(() => {
    setName(row.name);
    setYear(row.year);
  }, [row.name, row.year]);

  const saveBasics = async () => {
    if (name.trim() === row.name && year.trim() === row.year) return;
    if (await onPatch({ name: name.trim(), year: year.trim() }))
      pushToast("کلاس ذخیره شد.");
  };

  return (
    <article className={"card cls-card" + (row.active ? "" : " inactive")}>
      <header className="cls-head">
        <span className="cls-icon" aria-hidden="true">
          <img src="/emoji/1f3e0.png" alt="" />
        </span>
        <div className="cls-title">
          <b>{row.name}</b>
          <small>
            {row.year ? row.year + " · " : ""}
            {toFa(row.studentCount)} دانش‌آموز · {toFa(row.assignmentCount)} تکلیف
          </small>
        </div>
        <span className={"mission-chip " + (row.active ? "approved" : "pending")}>
          {row.active ? "فعال" : "غیرفعال"}
        </span>
      </header>

      <div className="cls-actions">
        <label className="sa-mini">
          <span>نام</span>
          <span className="sa-inline">
            <input
              type="text"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label={`نام ${row.name}`}
            />
            <button
              type="button"
              className="iconbtn"
              aria-label="ذخیرهٔ نام کلاس"
              disabled={busy}
              onClick={saveBasics}
            >
              <Save size={15} />
            </button>
          </span>
        </label>

        <label className="sa-mini">
          <span>سال / گروه</span>
          <input
            type="text"
            maxLength={20}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            onBlur={saveBasics}
            aria-label={`سال ${row.name}`}
          />
        </label>

        <label className="sa-mini">
          <span>نمایندهٔ آموزشی</span>
          <select
            value={row.repUsername}
            disabled={busy}
            onChange={(e) =>
              onPatch({ repUsername: e.target.value }).then((ok) => {
                if (ok)
                  pushToast(
                    e.target.value ? "نمایندهٔ کلاس عوض شد." : "نماینده برداشته شد."
                  );
              })
            }
            aria-label={`نمایندهٔ ${row.name}`}
          >
            <option value="">— بدون نماینده —</option>
            {reps.map((r) => (
              <option key={r.username} value={r.username}>
                {r.name} (@{r.username}){r.active ? "" : " — غیرفعال"}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn secondary"
          disabled={busy}
          onClick={() =>
            onPatch({ active: !row.active }).then((ok) => {
              if (ok)
                pushToast(row.active ? "کلاس غیرفعال شد." : "کلاس فعال شد.");
            })
          }
        >
          <UserRound size={15} />
          {row.active ? "غیرفعال کردن" : "فعال کردن"}
        </button>
      </div>

      {!row.repName && row.active ? (
        <p className="cls-hint">برای این کلاس هنوز نماینده‌ای انتخاب نشده است.</p>
      ) : null}
    </article>
  );
}
