"use client";

/**
 * LevelChat — آزمون تعیین سطح ساخت‌یافته (تمام‌کلیکی)
 *
 * - جریان سمت سرور کنترل می‌شود: ۱۲ سؤال چهارگزینه‌ای ثابت، بدون تایپ.
 * - دانش‌آموز فقط گزینه کلیک می‌کند؛ بعد از هر پاسخ بازخورد کوتاه +
 *   دکمهٔ «سؤال بعدی» و در پایان کارت نتیجه با جمع‌بندی.
 * - API: POST /api/assessment/chat — بدنه: { field, answer?, qIndex? }
 * - وضعیت نیمه‌کاره در localStorage (کلید roshd-quiz-<user>-<field>)؛
 *   اگر نشست سرور گم شده باشد، سرور با restart:true آزمون را از نو می‌دهد.
 * - همهٔ کلاس‌ها با پیشوند lc- (استایل در level-chat.css)
 */

import { useCallback, useEffect, useState } from "react";
import { useRoshd } from "@/store/roshd";
import { FIELDS, LEVELS } from "@/lib/missions-data";
import { LEVEL_MAP, AssessmentResult } from "@/lib/assessment-prompts";
import {
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Rocket,
  Target,
  XCircle,
} from "lucide-react";
import "./level-chat.css";

const OPT_LABELS = ["الف", "ب", "ج", "د"];

interface CurQ {
  qIndex: number;
  question: string;
  options: string[];
}

interface Feedback {
  chosen: number;
  correct: boolean;
  correctIndex: number;
  hint: string;
}

interface SavedState {
  cur: CurQ | null;
  done: boolean;
  result: AssessmentResult | null;
  resultMeta?: { correctCount: number; total: number };
}

type Phase = "intro" | "quiz" | "feedback" | "done";

function storageKey(username: string, field: string) {
  return `roshd-quiz-${username}-${field}`;
}

const API_ERROR = "ارتباط با آزمون برقرار نشد؛ لطفاً دوباره تلاش کن.";

export default function LevelChat() {
  const currentUser = useRoshd((s) => s.appData.currentUser);
  const serverUser = useRoshd((s) => s.serverUser);
  const curUser = useRoshd((s) => s.curUser);
  const pushToast = useRoshd((s) => s.pushToast);

  const username = currentUser || serverUser?.username || "";
  const field = curUser()?.field || "";

  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [cur, setCur] = useState<CurQ | null>(null);
  const [nextQ, setNextQ] = useState<CurQ | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [resultMeta, setResultMeta] = useState<{
    correctCount: number;
    total: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /* ---------- بارگذاری وضعیت نیمه‌کاره ---------- */

  useEffect(() => {
    setLoaded(false);
    setPhase("intro");
    setCur(null);
    setNextQ(null);
    setFeedback(null);
    setResult(null);
    setResultMeta(null);
    setError("");
    if (!username || !field) return;
    try {
      const raw = localStorage.getItem(storageKey(username, field));
      if (raw) {
        const d = JSON.parse(raw) as SavedState;
        if (d.done && d.result) {
          setResult(d.result);
          setResultMeta(d.resultMeta ?? null);
          setPhase("done");
        } else if (d.cur && d.cur.question) {
          setCur(d.cur);
          setPhase("quiz");
        }
      }
    } catch {
      /* وضعیت خراب — نادیده گرفته می‌شود */
    }
    setLoaded(true);
  }, [username, field]);

  /* ---------- ذخیره‌سازی ---------- */

  const persist = useCallback(
    (s: SavedState) => {
      if (!username || !field) return;
      try {
        if (!s.cur && !s.done)
          localStorage.removeItem(storageKey(username, field));
        else
          localStorage.setItem(storageKey(username, field), JSON.stringify(s));
      } catch {}
    },
    [username, field]
  );

  /* ---------- فراخوانی API ---------- */

  const call = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch("/api/assessment/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ field, ...body }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok)
        throw new Error(String(data.error || API_ERROR));
      return data;
    },
    [field]
  );

  /* ---------- شروع آزمون ---------- */

  const start = useCallback(async () => {
    if (busy || !field) return;
    setError("");
    setBusy(true);
    try {
      const d = await call({});
      const c: CurQ = {
        qIndex: Number(d.qIndex) || 1,
        question: String(d.question ?? ""),
        options: Array.isArray(d.options) ? d.options.map(String) : [],
      };
      if (!c.question || c.options.length !== 4)
        throw new Error("سؤال ناقص دریافت شد؛ دوباره تلاش کن.");
      setCur(c);
      setNextQ(null);
      setFeedback(null);
      setResult(null);
      setResultMeta(null);
      setPhase("quiz");
      persist({ cur: c, done: false, result: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : API_ERROR;
      setError(msg);
      pushToast(msg);
    } finally {
      setBusy(false);
    }
  }, [busy, field, call, persist, pushToast]);

  /* ---------- انتخاب گزینه ---------- */

  const choose = useCallback(
    async (opt: number) => {
      if (busy || !cur || feedback) return;
      setError("");
      setBusy(true);
      try {
        const d = await call({ answer: opt, qIndex: cur.qIndex });
        const fb = d.feedback as Feedback | undefined;
        const c: CurQ = {
          qIndex: Number(d.qIndex) || cur.qIndex + 1,
          question: String(d.question ?? ""),
          options: Array.isArray(d.options) ? d.options.map(String) : [],
        };

        // نشست سرور گم شده → آزمون از اول (با پیام)
        if (d.restart) {
          pushToast("نشست آزمون منقضی شده بود؛ آزمون از اول شروع شد.");
          setCur(c);
          setNextQ(null);
          setFeedback(null);
          setPhase("quiz");
          persist({ cur: c, done: false, result: null });
          return;
        }

        if (d.done && d.result) {
          const r = d.result as AssessmentResult;
          setFeedback(fb ?? null);
          setResult(r);
          setResultMeta({
            correctCount: Number((d.result as Record<string, unknown>).correctCount) || 0,
            total: Number((d.result as Record<string, unknown>).total) || 12,
          });
          setPhase("done");
          persist({ cur: null, done: true, result: r, resultMeta: { correctCount: Number((d.result as Record<string, unknown>).correctCount) || 0, total: Number((d.result as Record<string, unknown>).total) || 12 } });
          pushToast("آزمون تمام شد! نتیجه آماده است 🎉");
          return;
        }

        if (fb) {
          setFeedback(fb);
          setNextQ(c.question && c.options.length === 4 ? c : null);
          setPhase("feedback");
        } else if (c.question && c.options.length === 4) {
          // بدون بازخورد (نباید رخ دهد) — مستقیم سؤال بعدی
          setCur(c);
          setPhase("quiz");
          persist({ cur: c, done: false, result: null });
        } else {
          throw new Error("پاسخ ناقص از سرور؛ دوباره تلاش کن.");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : API_ERROR;
        setError(msg);
        pushToast(msg);
      } finally {
        setBusy(false);
      }
    },
    [busy, cur, feedback, call, persist, pushToast]
  );

  /* ---------- رفتن به سؤال بعدی ---------- */

  const goNext = useCallback(() => {
    if (!nextQ) return;
    setCur(nextQ);
    setNextQ(null);
    setFeedback(null);
    setPhase("quiz");
    persist({ cur: nextQ, done: false, result: null });
  }, [nextQ, persist]);

  /* ---------- شروع دوباره ---------- */

  const restart = useCallback(() => {
    if (busy) return;
    if (!window.confirm("مطمئنی؟ آزمون از اول شروع می‌شود.")) return;
    void start();
  }, [busy, start]);

  /* ---------- ثبت نتیجه ---------- */

  const submitLevel = useCallback(() => {
    if (!result) return;
    const key = LEVEL_MAP[result.level];
    if (!key) return;
    useRoshd.getState().selectLevel(key);
  }, [result]);

  /* ---------- رندر ---------- */

  if (!field) return null;
  const fieldDef = FIELDS[field];
  if (!fieldDef) return null;

  const total = 12;
  const answeredCount = cur ? cur.qIndex - 1 : 0;
  const progressPct =
    phase === "done" ? 100 : Math.round((answeredCount / total) * 100);

  return (
    <div className="card lc-card" dir="rtl">
      {phase === "intro" ? (
        <div className="lc-start">
          <div className="lc-start-emoji" aria-hidden="true">
            <Bot size={30} />
          </div>
          <h2 className="lc-start-title">آزمون تعیین سطح هوشمند</h2>
          <p>
۱۲ سؤال چهارگزینه‌ای دربارهٔ رشتهٔ{" "}
            <b>{fieldDef.name}</b> داری؛ از آسان شروع می‌شود و کم‌کم سخت‌تر
            می‌شود. فقط گزینه‌ها را کلیک کن — چیزی برای تایپ کردن نیست. در پایان
            سطح مناسب تو اعلام می‌شود.
          </p>
          <p className="lc-resume-note">
            <Clock size={14} /> زمان تقریبی: ۵ تا ۷ دقیقه — بدون نمرهٔ منفی
          </p>
          <button
            className="btn lc-start-btn"
            onClick={start}
            disabled={busy || !loaded}
          >
            <Rocket size={16} />
            شروع آزمون
          </button>
        </div>
      ) : (
        <div className="lc-box">
          <div className="lc-head">
            <b>
              <Bot size={16} /> آزمون تعیین سطح — {fieldDef.name}
            </b>
            {phase !== "done" && (
              <button
                className="lc-restart"
                onClick={restart}
                disabled={busy}
                aria-label="شروع دوبارهٔ آزمون"
              >
                شروع دوباره
              </button>
            )}
          </div>

          {/* نوار پیشرفت */}
          <div
            className="lc-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={phase === "done" ? total : answeredCount}
            aria-label="پیشرفت آزمون"
          >
            <div className="lc-progress-fill" style={{ width: `${progressPct}%` }} />
            <span className="lc-counter">
              {phase === "done"
                ? `پایان — ${total} سؤال`
                : `سؤال ${Math.min(answeredCount + 1, total)} از ${total}`}
            </span>
          </div>

          {/* سؤال فعلی */}
          {phase === "quiz" && cur && (
            <div className="lc-qcard lc-qcard-main" key={cur.qIndex}>
              <div className="lc-qtext" dir="auto">
                {cur.question}
              </div>
              <div className="lc-opts" role="group" aria-label="گزینه‌های سؤال">
                {cur.options.map((opt, oi) => (
                  <button
                    key={oi}
                    className="lc-opt"
                    disabled={busy}
                    onClick={() => choose(oi)}
                    aria-label={`انتخاب گزینه ${OPT_LABELS[oi]}`}
                  >
                    <span className="lc-opt-label">{OPT_LABELS[oi]})</span>
                    <span className="lc-opt-text" dir="auto">
                      {opt}
                    </span>
                  </button>
                ))}
              </div>
              {busy && (
                <div className="lc-typing lc-typing-main" aria-label="در حال آماده‌سازی سؤال بعدی">
                  <i />
                  <i />
                  <i />
                </div>
              )}
            </div>
          )}

          {/* بازخورد بعد از پاسخ */}
          {phase === "feedback" && feedback && (
            <div
              className={
                "lc-fb " + (feedback.correct ? "lc-fb-ok" : "lc-fb-no")
              }
              role="status"
              aria-live="polite"
            >
              <div className="lc-fb-title">
                {feedback.correct
                  ? <><CheckCircle2 size={16} /> درست بود! آفرین</>
                  : (
                    <>
                      <XCircle size={16} /> پاسخ درست: {OPT_LABELS[feedback.correctIndex]}
                      {") "}
                      <span dir="auto">{cur?.options[feedback.correctIndex] ?? ""}</span>
                    </>
                  )}
              </div>
              {feedback.hint ? (
                <div className="lc-fb-hint" dir="auto">
                  {feedback.hint}
                </div>
              ) : null}
              <button className="btn wide lc-next" onClick={goNext}>
                {nextQ
                  ? answeredCount + 1 >= total
                    ? <><Target size={16} /> دیدن نتیجه</>
                    : "سؤال بعدی"
                  : <><Target size={16} /> دیدن نتیجه</>}
              </button>
            </div>
          )}

          {error ? (
            <div className="lc-error" role="alert">
              {error}
            </div>
          ) : null}

          {/* نتیجهٔ نهایی */}
          {phase === "done" && result && (
            <div className="lc-result" role="status">
              <div className="lc-result-head">
                <Target size={18} />
                نتیجهٔ آزمون تعیین سطح
              </div>
              <div className="lc-result-grid">
                <div>
                  <small>سطح پیشنهادی</small>
                  <b>{LEVELS[LEVEL_MAP[result.level]] || "—"}</b>
                </div>
                <div>
                  <small>پاسخ درست</small>
                  <b>
                    {resultMeta?.correctCount ?? "—"} از {resultMeta?.total ?? total}
                  </b>
                </div>
                <div>
                  <small>اطمینان</small>
                  <b>{result.confidence}</b>
                </div>
              </div>
              {result.summary ? (
                <p className="lc-result-summary" dir="auto">
                  {result.summary}
                </p>
              ) : null}
              <button className="btn wide lc-submit" onClick={submitLevel}>
                <Check size={16} />
                ثبت سطح و ورود به داشبورد
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
