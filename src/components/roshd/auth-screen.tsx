"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useRoshd, api } from "@/store/roshd";

/** اگر خطا مربوط به دیتابیس/.env باشد، راهنمای رفع مشکل را اضافه می‌کند */
function friendlyAuthError(msg: string): string {
  if (
    /DATABASE_URL|PrismaClient|can't reach database|P1001|P1002|P1003|does not exist in the current database/i.test(
      msg
    )
  )
    return (
      msg +
      " — احتمالاً فایل .env در پروژه نیست؛ یک فایل .env کنار package.json با این خط بساز: DATABASE_URL=file:../db/custom.db و سرور را ری‌استارت کن."
    );
  return msg;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function AuthScreen() {
  const authTab = useRoshd((s) => s.authTab);
  const setAuthTab = useRoshd((s) => s.setAuthTab);
  const bindServerUser = useRoshd((s) => s.bindServerUser);
  const enterApp = useRoshd((s) => s.enterApp);
  const pushToast = useRoshd((s) => s.pushToast);

  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  const [regName, setRegName] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regError, setRegError] = useState("");
  const [regBusy, setRegBusy] = useState(false);
  const [regClass, setRegClass] = useState("");
  /* کلاس‌های فعال از API خوانده می‌شوند تا دانش‌آموز هنگام ثبت‌نام انتخاب کند */
  const [classes, setClasses] = useState<{ id: string; name: string; year: string }[]>([]);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .catch(() => {});
  }, []);

  /* ---------- بازیابی رمز ---------- */
  const [mode, setMode] = useState<"auth" | "recover">("auth");
  const [recStep, setRecStep] = useState<1 | 2>(1);
  const [recEmail, setRecEmail] = useState("");
  const [recCode, setRecCode] = useState("");
  const [recPass, setRecPass] = useState("");
  const [recBusy, setRecBusy] = useState(false);
  const [recError, setRecError] = useState("");
  const [recInfo, setRecInfo] = useState("");
  const [recDevCode, setRecDevCode] = useState("");

  const doLogin = async () => {
    setLoginError("");
    setLoginBusy(true);
    try {
      const d = await api("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser.trim(), password: loginPass }),
      });
      bindServerUser(d.user);
      enterApp();
    } catch (e: any) {
      setLoginError(friendlyAuthError(String(e?.message || "خطا")));
    } finally {
      setLoginBusy(false);
    }
  };

  const doRegister = async () => {
    setRegError("");
    setRegBusy(true);
    try {
      const d = await api("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          username: regUser.trim(),
          email: regEmail.trim(),
          password: regPass,
          classId: regClass,
        }),
      });
      bindServerUser(d.user);
      enterApp();
    } catch (e: any) {
      setRegError(friendlyAuthError(String(e?.message || "خطا")));
    } finally {
      setRegBusy(false);
    }
  };

  /* ---------- گام ۱: درخواست کد ---------- */
  const doForgot = async () => {
    setRecError("");
    setRecInfo("");
    setRecDevCode("");
    if (!EMAIL_RE.test(recEmail.trim())) {
      setRecError("یک ایمیل معتبر وارد کن.");
      return;
    }
    setRecBusy(true);
    try {
      const r = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recEmail.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "ارسال کد ناموفق بود.");
      if (d.devCode) {
        setRecDevCode(String(d.devCode));
        setRecInfo(
          (d.devNote || "") +
            " کد را وارد کن و رمز جدید بساز."
        );
      } else {
        setRecInfo("اگر این ایمیل در حساب تو ثبت باشد، کد برایت ارسال شد. کد و رمز جدید را در قدم بعد وارد کن.");
      }
      setRecStep(2);
    } catch (e: any) {
      setRecError(String(e?.message || "خطا"));
    } finally {
      setRecBusy(false);
    }
  };

  /* ---------- گام ۲: کد + رمز جدید ---------- */
  const doReset = async () => {
    setRecError("");
    if (recPass.length < 4) {
      setRecError("رمز عبور باید حداقل ۴ کاراکتر باشد.");
      return;
    }
    setRecBusy(true);
    try {
      const r = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: recEmail.trim(),
          code: recCode.trim(),
          password: recPass,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "تغییر رمز ناموفق بود.");
      setMode("auth");
      setAuthTab("login");
      setRecStep(1);
      setRecCode("");
      setRecPass("");
      setRecInfo("");
      setRecDevCode("");
      setLoginUser("");
      setLoginPass("");
      pushToast("رمز عوض شد؛ حالا با رمز جدید وارد شو.");
    } catch (e: any) {
      setRecError(String(e?.message || "خطا"));
    } finally {
      setRecBusy(false);
    }
  };

  const backToLogin = () => {
    setMode("auth");
    setAuthTab("login");
    setRecStep(1);
    setRecError("");
    setRecInfo("");
    setRecDevCode("");
  };

  /* ---------- فرم بازیابی رمز ---------- */
  if (mode === "recover") {
    return (
      <div className="auth-wrap">
        <div style={{ textAlign: "center", marginBottom: "1.375rem" }}>
          <div className="logo" style={{ fontSize: "1.875rem" }}>
            مسیر <span>رشد</span>
          </div>
          <div className="subtitle">بازیابی رمز عبور با ایمیل</div>
        </div>
        <div className="card" style={{ padding: "1.625rem" }}>
          {recStep === 1 ? (
            <div>
              <div className="field-group">
                <label htmlFor="recEmail">ایمیل حساب</label>
                <input
                  id="recEmail"
                  type="email"
                  dir="ltr"
                  placeholder="you@example.com"
                  value={recEmail}
                  onChange={(e) => setRecEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doForgot()}
                />
                <small className="note" style={{ display: "block", marginTop: "0.375rem" }}>
                  همان ایمیلی که موقع ثبت‌نام دادی یا در تنظیمات ثبت کرده‌ای.
                </small>
              </div>
              <button className="btn wide" onClick={doForgot} disabled={recBusy}>
                {recBusy ? "در حال ارسال…" : "ارسال کد بازیابی"}
              </button>
            </div>
          ) : (
            <div>
              {recDevCode ? (
                <div
                  role="status"
                  style={{
                    background: "var(--accent-soft, rgba(0,0,0,.05))",
                    border: "1px dashed var(--accent)",
                    borderRadius: ".75rem",
                    padding: ".75rem 1rem",
                    marginBottom: "1rem",
                    textAlign: "center",
                  }}
                >
                  <b style={{ letterSpacing: ".3em", fontSize: "1.5rem", display: "block" }} dir="ltr">
                    {recDevCode}
                  </b>
                  <small className="note">{recInfo}</small>
                </div>
              ) : (
                <p className="note" style={{ marginTop: 0 }}>
                  {recInfo || "کد بازیابی را از ایمیلت وارد کن."}
                </p>
              )}
              <div className="field-group">
                <label htmlFor="recCode">کد بازیابی (۶ رقم)</label>
                <input
                  id="recCode"
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={recCode}
                  onChange={(e) => setRecCode(e.target.value)}
                />
              </div>
              <div className="field-group">
                <label htmlFor="recPass">رمز عبور جدید</label>
                <input
                  id="recPass"
                  type="password"
                  placeholder="حداقل ۴ کاراکتر"
                  value={recPass}
                  onChange={(e) => setRecPass(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doReset()}
                />
              </div>
              <button className="btn wide" onClick={doReset} disabled={recBusy}>
                {recBusy ? "در حال تغییر رمز…" : "تغییر رمز عبور"}
              </button>
            </div>
          )}
          {recError ? (
            <div className="error-msg" role="alert">
              {recError}
            </div>
          ) : null}
          <button
            className="btn secondary wide"
            onClick={backToLogin}
            disabled={recBusy}
            style={{ marginTop: ".75rem" }}
          >
            <ArrowRight size={16} className="back-arrow" aria-hidden="true" />
            برگشت به ورود
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      {/* لوگوی صفحه در نوار بالای سایت هست؛ اینجا تکرار نمی‌شود */}
      <div style={{ textAlign: "center", marginBottom: "1.375rem" }}>
        <div className="subtitle">
          وارد شو یا یک حساب جدید بساز تا ماموریت‌های روزانه‌ات شروع بشه
        </div>
      </div>
      <div className="auth-tabs" role="tablist">
        <div
          className={"auth-tab" + (authTab === "login" ? " active" : "")}
          id="loginTabBtn"
          role="tab"
          aria-selected={authTab === "login"}
          tabIndex={0}
          onClick={() => setAuthTab("login")}
          onKeyDown={(e) => e.key === "Enter" && setAuthTab("login")}
        >
          ورود
        </div>
        <div
          className={"auth-tab" + (authTab === "register" ? " active" : "")}
          id="registerTabBtn"
          role="tab"
          aria-selected={authTab === "register"}
          tabIndex={0}
          onClick={() => setAuthTab("register")}
          onKeyDown={(e) => e.key === "Enter" && setAuthTab("register")}
        >
          ثبت‌نام
        </div>
      </div>
      <div className="card" style={{ padding: "1.625rem" }}>
        {authTab === "login" ? (
          <div id="loginPane">
            <div className="field-group">
              <label htmlFor="loginUser">نام کاربری یا ایمیل</label>
              <input
                id="loginUser"
                type="text"
                placeholder="مثلاً amir_99 یا a@b.com"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doLogin()}
                autoComplete="username"
              />
            </div>
            <div className="field-group">
              <label htmlFor="loginPass">رمز عبور</label>
              <input
                id="loginPass"
                type="password"
                placeholder="رمز عبورت را وارد کن"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doLogin()}
              />
            </div>
            <button className="btn wide" onClick={doLogin} disabled={loginBusy}>
              {loginBusy ? "در حال ورود…" : "ورود به حساب"}
            </button>
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setMode("recover");
                setRecError("");
                setRecInfo("");
                setRecDevCode("");
                setRecStep(1);
              }}
              style={{
                display: "block",
                margin: "0.75rem auto 0",
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                font: "inherit",
                fontSize: "0.875rem",
                minHeight: "44px",
              }}
            >
              رمزت را فراموش کردی؟ بازیابی با ایمیل
            </button>
            <div className="error-msg" id="loginError" role="alert">
              {loginError}
            </div>
          </div>
        ) : (
          <div id="registerPane">
            <div className="field-group">
              <label htmlFor="regName">نام و نام خانوادگی</label>
              <input
                id="regName"
                type="text"
                placeholder="نام کامل برای گواهی و رتبه‌بندی"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label htmlFor="regUser">نام کاربری</label>
              <input
                id="regUser"
                type="text"
                placeholder="یک نام کاربری یکتا انتخاب کن"
                value={regUser}
                onChange={(e) => setRegUser(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label htmlFor="regEmail">ایمیل (اختیاری)</label>
              <input
                id="regEmail"
                type="email"
                dir="ltr"
                placeholder="you@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
              <small className="note" style={{ display: "block", marginTop: "0.375rem" }}>
                اگر رمزت را فراموش کنی، با همین ایمیل می‌توانی بازیابیش کنی.
              </small>
            </div>
            <div className="field-group">
              <label htmlFor="regClass">کلاس (اختیاری)</label>
              <select
                id="regClass"
                value={regClass}
                onChange={(e) => setRegClass(e.target.value)}
              >
                <option value="">— بدون کلاس —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.year ? ` — ${c.year}` : ""}
                  </option>
                ))}
              </select>
              <small className="note" style={{ display: "block", marginTop: "0.375rem" }}>
                اگر از قبل در کلاسی هستی و کلاس را نمی‌دانی، خالی بگذار؛ مدیر مدرسه بعداً وصلت می‌کند.
              </small>
            </div>
            <div className="field-group">
              <label htmlFor="regPass">رمز عبور</label>
              <input
                id="regPass"
                type="password"
                placeholder="حداقل ۴ کاراکتر"
                value={regPass}
                onChange={(e) => setRegPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doRegister()}
              />
            </div>
            <button className="btn wide" onClick={doRegister} disabled={regBusy}>
              {regBusy ? "در حال ساخت…" : "ساخت حساب"}
            </button>
            <div className="error-msg" id="registerError" role="alert">
              {regError}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
