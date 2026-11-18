/**
 * POST /api/assessment/chat — آزمون تعیین سطح ساخت‌یافته (جریان سمت سرور)
 *
 * چرا دیگر «چت آزاد» نیست؟ مدل‌های رایگان/ضعیف در حالت چت، آزمون را بعد
 * از یکی‌دو سؤال خودشان تمام می‌کردند. حالا سرور کنترل را در دست دارد:
 *   - بدنه: { field, answer?: 0..3, qIndex?: number }
 *     · بدون answer → شروع آزمون (سؤال ۱) یا شروع دوباره
 *     · با answer  → تصحیح سؤال فعلی + ساخت سؤال بعدی (یا نتیجهٔ نهایی)
 *   - پاسخ: { qIndex, total, question?, options?, feedback?, done, result?, restart? }
 *   - LLM فقط «سازندهٔ سؤال» است؛ تصحیح و نتیجه قطعیِ سرور است.
 *   - شکست LLM → بانک سؤال پشتیبان (آزمون هرگز وسط راه نمی‌ایستد).
 */

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { currentUser, jsonError } from "@/lib/auth";
import { FIELDS } from "@/lib/missions-data";
import {
  TOTAL_QUESTIONS,
  FIELD_NAMES,
  getSession,
  createSession,
  saveSession,
  dropSession,
  questionPrompt,
  parseQuestionJSON,
  bankQuestion,
  computeResult,
  fallbackSummary,
  summaryPrompt,
  ParsedQuestion,
  QuizFeedback,
  QuizResult,
} from "@/lib/assessment-quiz";

/* ---------- rate limit در حافظه (per-sid: ۳۰ درخواست در دقیقه) ---------- */

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

const buckets = new Map<string, { count: number; resetAt: number }>();

function allowRequest(key: string): boolean {
  const now = Date.now();
  if (buckets.size > 1000) {
    for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  b.count++;
  return b.count <= RATE_LIMIT;
}

/* ---------- فراخوانی LLM (همان زنجیرهٔ سه‌لایه) ---------- */

const LLM_TIMEOUT_MS = 60_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("llm-timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

interface LlmMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callOpenRouter(system: string, user: string): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY as string;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const r = await withTimeout(
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer":
          process.env.OPENROUTER_SITE_URL || "https://roshd-roude.app",
        "X-Title": "Roshd Roud — Assessment",
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ] satisfies LlmMsg[],
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    }),
    LLM_TIMEOUT_MS + 5_000
  );
  if (!r.ok) throw new Error(`openrouter-${r.status}`);
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim())
    throw new Error("openrouter-empty");
  return text;
}

/** Pollinations — API رایگان و بدون کلید؛ محدودیت نرخ ~۱ درخواست در ۳ ثانیه */
let lastPollinationsAt = 0;

async function callPollinations(system: string, user: string): Promise<string> {
  const gap = lastPollinationsAt + 2_800 - Date.now();
  if (gap > 0) await new Promise((res) => setTimeout(res, gap));
  lastPollinationsAt = Date.now();
  const model = process.env.POLLINATIONS_MODEL || "openai-fast";
  const r = await withTimeout(
    fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        referrer: "roshd-roude",
        private: true,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    }),
    LLM_TIMEOUT_MS + 5_000
  );
  if (!r.ok) throw new Error(`pollinations-${r.status}`);
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim())
    throw new Error("pollinations-empty");
  return text;
}

async function callZai(system: string, user: string): Promise<string> {
  const mod = await import("z-ai-web-dev-sdk");
  const ZAI = mod.default;
  const zai = await ZAI.create();
  const completion = await withTimeout(
    zai.chat.completions.create({
      messages: [
        { role: "assistant", content: system },
        { role: "user", content: user },
      ],
      thinking: { type: "disabled" },
    }),
    LLM_TIMEOUT_MS + 15_000
  );
  const text = completion?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("zai-empty");
  return text;
}

async function callLLM(system: string, user: string): Promise<string> {
  if (process.env.OPENROUTER_API_KEY) {
    return callOpenRouter(system, user);
  }
  try {
    return await callPollinations(system, user);
  } catch (pe) {
    console.error(
      "[assessment/chat] pollinations failed:",
      pe instanceof Error ? pe.message : pe
    );
    return callZai(system, user);
  }
}

/* ---------- ساخت سؤال با ۲ تلاش + بانک پشتیبان ---------- */

async function generateQuestion(
  field: string,
  qIndex: number,
  asked: string[],
  okFlags: boolean[]
): Promise<ParsedQuestion> {
  const base = questionPrompt(field, qIndex, asked, okFlags);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const user =
        attempt === 0
          ? base.user
          : `${base.user}\n\nپاسخ قبلی نامعتبر بود. این بار فقط و فقط شیء JSON خام برگردان.`;
      const text = await callLLM(base.system, user);
      const parsed = parseQuestionJSON(text);
      if (parsed) return parsed;
      console.error(
        `[assessment/chat] bad question JSON (q${qIndex}, attempt ${attempt + 1})`
      );
    } catch (e) {
      console.error(
        `[assessment/chat] question LLM failed (q${qIndex}):`,
        e instanceof Error ? e.message : e
      );
    }
  }
  // LLM در دسترس نیست / خروجی خراب — بانک پشتیبان؛ آزمون می‌ایستد؟ نه!
  return bankQuestion(field, qIndex, asked);
}

/* ---------- route ---------- */

function qPayload(q: ParsedQuestion, qIndex: number, total: number) {
  return { qIndex, total, question: q.question, options: q.options };
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return jsonError("ابتدا وارد حساب کاربری شو.", 401);
    if (String(user.role) === "parent")
      return jsonError(
        "حساب اولیا فقط برای مشاهده است و اجازهٔ آزمون دادن ندارد.",
        403
      );

    const store = await cookies();
    const sid = store.get("sid")?.value || user.username;
    if (!allowRequest(sid))
      return jsonError(
        "تعداد درخواست‌های تو زیاد است؛ یک دقیقه صبر کن و دوباره تلاش کن.",
        429
      );

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body || typeof body !== "object")
      return jsonError("بدنهٔ درخواست نامعتبر است.");

    const field = String(body.field ?? "");
    if (!Object.prototype.hasOwnProperty.call(FIELDS, field))
      return jsonError("رشتهٔ نامعتبر است.", 400);
    if (!FIELD_NAMES[field])
      return jsonError("پیکربندی آزمون این رشته پیدا نشد.", 400);

    const username = user.username;
    const answer = Number.isInteger(body.answer)
      ? Number(body.answer)
      : null;
    const qIndexIn = Number.isInteger(body.qIndex) ? Number(body.qIndex) : 0;

    /* ---------- شروع / شروع دوباره ---------- */
    if (answer === null) {
      const state = createSession(field);
      const q = await generateQuestion(field, 1, [], []);
      state.pending = q;
      saveSession(username, field, state);
      return Response.json({
        ...qPayload(q, 1, TOTAL_QUESTIONS),
        done: false,
      });
    }

    /* ---------- پاسخ به سؤال ---------- */
    if (answer < 0 || answer > 3)
      return jsonError("گزینهٔ انتخابی نامعتبر است.", 400);

    let state = getSession(username, field);

    // نشست سرور گم شده (ری‌استارت سرور / انقضا) → آزمون از نو با پرچم restart
    if (!state || !state.pending) {
      state = createSession(field);
      const q = await generateQuestion(field, 1, [], []);
      state.pending = q;
      saveSession(username, field, state);
      return Response.json({
        restart: true,
        ...qPayload(q, 1, TOTAL_QUESTIONS),
        done: false,
      });
    }

    // idempotency: این سؤال قبلاً تصحیح شده → همین سؤال در انتظار، بدون تصحیح دوباره
    if (qIndexIn && qIndexIn <= state.okFlags.length) {
      const p = state.pending;
      return Response.json({
        ...qPayload(p, state.okFlags.length + 1, TOTAL_QUESTIONS),
        done: false,
      });
    }

    // تصحیح سؤال فعلی
    const pending = state.pending;
    const feedback: QuizFeedback = {
      chosen: answer,
      correct: answer === pending.correct,
      correctIndex: pending.correct,
      hint: pending.hint,
    };
    state.okFlags.push(feedback.correct);
    state.asked.push(pending.question);

    /* ---------- پایان آزمون → نتیجهٔ قطعی ---------- */
    if (state.okFlags.length >= TOTAL_QUESTIONS) {
      const r = computeResult(state.okFlags);
      let summary = "";
      try {
        const sp = summaryPrompt(field, state.okFlags, state.asked, r.level);
        const text = await callLLM(sp.system, sp.user);
        const clean = text
          .trim()
          .replace(/^["«»“”\s]+|["«»“”\s]+$/g, "")
          .replace(/```+/g, "")
          .trim();
        if (clean.length >= 20 && clean.length <= 1200) summary = clean;
      } catch (e) {
        console.error(
          "[assessment/chat] summary LLM failed:",
          e instanceof Error ? e.message : e
        );
      }
      if (!summary) summary = fallbackSummary(r.level, r.correctCount, r.total);

      const result: QuizResult = { ...r, summary };
      dropSession(username, field);
      return Response.json({ done: true, feedback, result });
    }

    /* ---------- سؤال بعدی ---------- */
    const nextIdx = state.okFlags.length + 1;
    const nq = await generateQuestion(
      field,
      nextIdx,
      state.asked,
      state.okFlags
    );
    state.pending = nq;
    state.createdAt = Date.now();
    saveSession(username, field, state);
    return Response.json({
      ...qPayload(nq, nextIdx, TOTAL_QUESTIONS),
      feedback,
      done: false,
    });
  } catch (e) {
    console.error(
      "[assessment/chat] error:",
      e instanceof Error ? e.message : e
    );
    return jsonError("خطای سرور در آزمون تعیین سطح.", 500);
  }
}
