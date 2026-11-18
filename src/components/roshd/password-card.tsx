"use client";

import { useState } from "react";
import { api, useRoshd } from "@/store/roshd";
import { KeyRound } from "lucide-react";

/** تغییر رمز حساب — با هش scrypt سمت سرور (رمز خام جایی ذخیره نمی‌شود) */
export default function PasswordCard() {
  const pushToast = useRoshd((s) => s.pushToast);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (next.length < 6) {
      setErr("رمز جدید باید حداقل ۶ نویسه باشد.");
      return;
    }
    if (next !== again) {
      setErr("رمز جدید و تکرارش یکسان نیست.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      pushToast("رمزت عوض شد.");
      setCurrent("");
      setNext("");
      setAgain("");
      setOpen(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card settings-section password-card">
      <h2 className="section-title">
        <KeyRound size={18} />
        رمز عبور
      </h2>

      {!open ? (
        <div className="setting-row">
          <div className="setting-label">
            تغییر رمز حساب
            <small>رمز جدید با همان روش امن پروژه ذخیره می‌شود.</small>
          </div>
          <button
            type="button"
            className="btn secondary"
            onClick={() => setOpen(true)}
          >
            تغییر رمز
          </button>
        </div>
      ) : (
        <div className="password-form">
          <label>
            <span>رمز فعلی</span>
            <input
              type="password"
              dir="ltr"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label>
            <span>رمز جدید</span>
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </label>
          <label>
            <span>تکرار رمز جدید</span>
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={again}
              onChange={(e) => setAgain(e.target.value)}
            />
          </label>

          {err ? (
            <div className="error-msg" role="alert">
              {err}
            </div>
          ) : null}

          <div className="password-actions">
            <button
              type="button"
              className="btn"
              onClick={submit}
              disabled={busy}
            >
              {busy ? "در حال ذخیره…" : "ذخیرهٔ رمز جدید"}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setOpen(false);
                setErr("");
              }}
            >
              انصراف
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
