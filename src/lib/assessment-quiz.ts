/**
 * موتور آزمون تعیین سطح ساخت‌یافته — کاملاً سمت سرور
 *
 * چرا این فایل وجود دارد؟ وقتی جریان آزمون به LLM سپرده شود، مدل‌های
 * رایگان/ضعیف بعد از یکی‌دو سؤال خودشان آزمون را تمام می‌کنند و گزارش
 * می‌دهند (گزارش کاربر: «فقط یک سؤال می‌پرسد»). راه‌حل: کنترل جریان
 * از مدل گرفته می‌شود —
 *
 *   ۱. آزمون دقیقاً ۱۲ سؤال چهارگزینه‌ای است (نردبان دشواری ثابت).
 *   ۲. سرور سؤال‌به‌سؤال از LLM می‌سازد و JSON سخت‌گیرانه می‌پذیرد.
 *   ۳. تصحیح پاسخ‌ها و نتیجهٔ نهایی قطعیِ سرور است (نه حدس مدل).
 *   ۴. اگر LLM در دسترس نبود/خروجی خراب داد، بانک سؤال پشتیبان
 *      استفاده می‌شود تا آزمون هیچ‌وقت وسط راه نایستد.
 *
 * نشست آزمون در حافظه نگهداری می‌شود (TTL ۴۵ دقیقه)؛ گم‌شدن نشست
 * (ری‌استارت سرور) به‌صورت شفاف با پرچم restart به ابتدای آزمون برمی‌گردد.
 */

import { BANK } from "./assessment-bank";

export const TOTAL_QUESTIONS = 12;

export interface ParsedQuestion {
  question: string;
  options: string[];
  correct: number; // 0..3
  hint: string; // توضیح کوتاه — فقط بعد از پاسخ دانش‌آموز نمایش داده می‌شود
}

export interface QuizFeedback {
  chosen: number;
  correct: boolean;
  correctIndex: number;
  hint: string;
}

export interface QuizResult {
  level: number; // 1..4
  score: number; // 0..100
  confidence: string; // کم | متوسط | بالا
  summary: string;
  correctCount: number;
  total: number;
}

/* =========================================================
   نشست آزمون در حافظه
   ========================================================= */

interface AssessState {
  field: string;
  pending: ParsedQuestion | null;
  okFlags: boolean[]; // نتیجهٔ تصحیح سؤال‌های پاسخ‌داده‌شده
  asked: string[]; // متن سؤال‌های طرح‌شده (جلوگیری از تکرار)
  createdAt: number;
}

const STATE_TTL_MS = 45 * 60_000;
const sessions = new Map<string, AssessState>();

function sessionKey(username: string, field: string) {
  return `${username}::${field}`;
}

function cleanupSessions() {
  if (sessions.size <= 200) return;
  const now = Date.now();
  for (const [k, s] of sessions) {
    if (now - s.createdAt > STATE_TTL_MS) sessions.delete(k);
  }
}

export function getSession(username: string, field: string): AssessState | null {
  cleanupSessions();
  const s = sessions.get(sessionKey(username, field));
  if (!s) return null;
  if (Date.now() - s.createdAt > STATE_TTL_MS) {
    sessions.delete(sessionKey(username, field));
    return null;
  }
  return s;
}

export function createSession(field: string): AssessState {
  return { field, pending: null, okFlags: [], asked: [], createdAt: Date.now() };
}

export function saveSession(username: string, field: string, s: AssessState) {
  cleanupSessions();
  sessions.set(sessionKey(username, field), s);
}

export function dropSession(username: string, field: string) {
  sessions.delete(sessionKey(username, field));
}

/* =========================================================
   حوزه‌های هر رشته (هماهنگ با پرامپت‌های مرجع)
   ========================================================= */

export const FIELD_NAMES: Record<string, string> = {
  computer: "شبکه و نرم‌افزار (کامپیوتر)",
  animation: "انیمیشن",
  graphic: "طراحی گرافیک",
  tv: "تولید برنامه تلویزیونی",
};

const AREAS: Record<string, string[]> = {
  computer: [
    "مبانی کامپیوتر و سخت‌افزار",
    "الگوریتم، منطق و حل مسئله",
    "مفاهیم اولیهٔ برنامه‌نویسی (متغیر، شرط، حلقه، تابع)",
    "سیستم‌عامل و مدیریت فایل‌ها",
    "مفاهیم شبکه، نشانی IP، DNS، روتر و سوئیچ",
    "عیب‌یابی مشکلات سادهٔ کامپیوتر و شبکه",
    "طراحی الگوریتم و تحلیل سناریوهای واقعی",
  ],
  animation: [
    "اصول دوازدهگانهٔ انیمیشن (اسکواش و استرچ، تایمینگ، پیش‌نگرگی)",
    "استوری‌بورد و روایت صحنه",
    "طراحی شخصیت و شکل‌های پایه",
    "انیمیشن فریم‌به‌فریم و چرخه‌های حرکتی",
    "نرم‌افزارهای انیمیشن مانند Blender و After Effects",
    "تحلیل صحنه و حرکت در انیمیشن‌های نمونه",
    "طراحی صحنهٔ کامل و زمان‌بندی حرکت دوربین",
  ],
  graphic: [
    "ترکیب‌بندی و سلسله‌مراتب بصری",
    "رنگ‌شناسی (RGB، CMYK، هارمونی و پالت رنگ)",
    "تایپوگرافی و انتخاب فونت",
    "هویت بصری و طراحی لوگو",
    "ابزارهای طراحی مانند Photoshop و Illustrator",
    "نقد و تحلیل طرح‌های گرافیکی",
    "طراحی کمپین تبلیغاتی و هویت برند",
  ],
  tv: [
    "قاب‌بندی و انواع شات‌ها",
    "سناریو و نگارش متن گویندگی",
    "طراحی سؤال و اجرای مصاحبه",
    "استوری‌بورد ویدیویی و لیست شات",
    "تدوین و ریتم کات",
    "تولید برنامه؛ زمان‌بندی، تجهیزات و تیم تولید",
    "طراحی کامل یک برنامه و تحلیل برنامه‌های واقعی",
  ],
};

/** نردبان دشواری — ثابت و مستقل از تصمیم مدل */
function tierOf(qIndex: number): string {
  if (qIndex <= 3) return "آسان — مفاهیم پایه‌ای";
  if (qIndex <= 6) return "متوسط";
  if (qIndex <= 9) return "نسبتاً دشوار — کاربردی";
  if (qIndex <= 11) return "پیشرفته";
  return "پیشرفته — سناریوی عملی ترکیبی از چند حوزه";
}

/* =========================================================
   پرامپت ساخت سؤال + پارس JSON
   ========================================================= */

export function questionPrompt(
  field: string,
  qIndex: number,
  asked: string[],
  okFlags: boolean[]
): { system: string; user: string } {
  const trackName = FIELD_NAMES[field] ?? field;
  const area = AREAS[field] ?? [];
  const pickedArea = area.length ? area[(qIndex - 1) % area.length] : "مفاهیم عمومی رشته";

  // نکتهٔ تطبیقی بر اساس دو/سه پاسخ آخر
  const last2 = okFlags.slice(-2);
  const last3 = okFlags.slice(-3);
  let adaptive = "";
  if (okFlags.length >= 2 && last2.every((v) => !v))
    adaptive = "دو پاسخ آخر دانش‌آموز نادرست بوده؛ این سؤال را کمی ساده‌تر طرح کن.";
  else if (okFlags.length >= 3 && last3.every((v) => v))
    adaptive = "سه پاسخ آخر درست بوده؛ می‌توانی دشواری را یک پله بالا ببری.";

  const askedList = asked.length
    ? asked
        .slice(-8)
        .map((q) => `- ${q.slice(0, 90)}`)
        .join("\n")
    : "—";

  const system = `تو سازندهٔ سؤال آزمون تعیین سطح هنرستان در رشتهٔ «${trackName}» هستی.
فقط و فقط یک شیء JSON معتبر برگردان — بدون هیچ متن اضافه، بدون بک‌تیک، بدون توضیح:
{"question":"متن سؤال","options":["گزینه ۱","گزینه ۲","گزینه ۳","گزینه ۴"],"correct":0,"hint":"یک جملهٔ کوتاه فارسی دربارهٔ پاسخ درست"}

قوانین الزامی:
- زبان فارسی روان؛ اگر اصطلاح تخصصی انگلیسی لازم شد داخل پرانتز بیاور.
- سؤال فقط یک مفهوم یا مهارت اصلی را بسنجد و در یک تا دو جمله باشد.
- دقیقاً ۴ گزینه؛ مستقل، روشن، هم‌طول و غیرقابل‌حدس از ظاهر.
- «correct» اندیس گزینهٔ درست است (عدد ۰ تا ۳).
- «hint» حداکثر ۲۰ کلمه؛ پاسخ را مستقیم لو ندهد.
- هرگز نام، سن یا پایهٔ تحصیلی دانش‌آموز را نپرس؛ هیچ داده‌ای از دانش‌آموز لازم نیست.
- سؤال حفظی خشک نده؛ یک موقعیت یا داستان کوتاه بساز و از دانش‌آموز بخواه تصمیم درست را انتخاب کند (مثل «مشتری می‌گوید لوگوت شلوغ است، چه می‌کنی؟»).
- هر سؤال فقط یک تصمیم یا یک مفهوم داشته باشد و گزینه‌ها معقول و نزدیک به هم باشند.`;

  const user = `سؤال شمارهٔ ${qIndex} از ${TOTAL_QUESTIONS} — سطح دشواری: ${tierOf(qIndex)}.
حوزهٔ این سؤال: ${pickedArea}.
${adaptive ? adaptive + "\n" : ""}
سؤال‌هایی که قبلاً پرسیده شده و نباید تکرار شوند:
${askedList}`;

  return { system, user };
}

/** پارس سخت‌گیرانهٔ JSON سؤال؛ هر مشکلی → null (و بعد بانک پشتیبان) */
export function parseQuestionJSON(raw: string): ParsedQuestion | null {
  if (!raw) return null;
  const t = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  try {
    const o = JSON.parse(t.slice(s, e + 1)) as Record<string, unknown>;
    const question = String(o.question ?? "").trim();
    const options = Array.isArray(o.options)
      ? o.options.map((x) => String(x ?? "").trim()).filter(Boolean)
      : [];
    const correct = Math.round(Number(o.correct));
    const hint = String(o.hint ?? "").trim();
    if (!question || question.length > 600) return null;
    if (options.length !== 4 || options.some((x) => !x || x.length > 300)) return null;
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) return null;
    if (new Set(options.map((x) => x.replace(/\s+/g, " "))).size < 4) return null;
    return { question, options, correct, hint: hint.slice(0, 220) };
  } catch {
    return null;
  }
}

/* =========================================================
   بانک سؤال پشتیبان — وقتی LLM در دسترس نیست یا خروجی خراب داد
   (سؤال‌ها در src/lib/assessment-bank.ts هستند)
   ========================================================= */

/** سؤال پشتیبان: اول سؤال تکرارنشدنی؛ اگر همه تکرار بودند، چرخشی */
export function bankQuestion(field: string, qIndex: number, asked: string[]): ParsedQuestion {
  const bank = BANK[field] ?? BANK.computer;
  const askedSet = new Set(asked);
  for (let i = 0; i < bank.length; i++) {
    const cand = bank[(qIndex - 1 + i) % bank.length];
    if (!askedSet.has(cand.question)) return cand;
  }
  return bank[(qIndex - 1) % bank.length];
}

/* =========================================================
   نتیجهٔ قطعی سمت سرور
   ========================================================= */

export const LEVEL_WORDS: Record<number, string> = {
  1: "مبتدی",
  2: "پایه",
  3: "متوسط",
  4: "پیشرفته",
};

export function computeResult(okFlags: boolean[]): Omit<QuizResult, "summary"> {
  const total = okFlags.length;
  const correctCount = okFlags.filter(Boolean).length;
  const score = Math.round((correctCount / total) * 100);
  // ۱۲ سؤال در ۴ پله (آسان/متوسط/کاربردی/پیشرفته) → آستانه‌ها: ۴ و ۷ و ۱۰
  const level = correctCount >= 10 ? 4 : correctCount >= 7 ? 3 : correctCount >= 4 ? 2 : 1;

  // اطمینان: الگوی آشفتهٔ پاسخ‌ها یا نزدیکی به مرز پله‌ها → متوسط
  let flips = 0;
  for (let i = 1; i < okFlags.length; i++) if (okFlags[i] !== okFlags[i - 1]) flips++;
  const nearBoundary = [3, 4, 6, 7, 9, 10].includes(correctCount);
  const confidence = flips >= 6 || nearBoundary ? "متوسط" : "بالا";

  return { level, score, confidence, correctCount, total };
}

/** جمع‌بندی متن نهایی وقتی LLM در دسترس نیست */
export function fallbackSummary(level: number, correctCount: number, total: number): string {
  const w = LEVEL_WORDS[level] ?? "پایه";
  const pct = Math.round((correctCount / total) * 100);
  if (correctCount >= 10)
    return `آفرین! به ${correctCount} سؤال از ${total} سؤال (${pct}٪) پاسخ درست دادی و تسلط خوبی روی مباحث پیشرفته نشان دادی. سطح پیشنهادی شروع تو «${w}» است؛ مستقیم سراغ مأموریت‌های چالشی برو و پروژه‌های ترکیبی انجام بده.`;
  if (correctCount >= 7)
    return `خیلی خوب بود! ${correctCount} پاسخ درست از ${total} سؤال (${pct}٪) یعنی پایه‌های اصلی را بلدی و فقط باید روی مباحث کاربردی‌تر تمرین کنی. سطح پیشنهادی تو «${w}» است؛ از مأموریت‌های همین سطح شروع کن و سؤال‌های غلط را دوباره مرور کن.`;
  if (correctCount >= 4)
    return `شروع قابل قبولی بود؛ ${correctCount} پاسخ درست از ${total} سؤال (${pct}٪) نشان می‌دهد با مفاهیم اولیه آشنایی داری ولی به تمرین بیشتری نیاز داری. سطح پیشنهادی تو «${w}» است؛ با مأموریت‌های قدم‌به‌قدم همین سطح شروع کن و جواب‌های نادرست را یادداشت کن.`;
  return `مشکلی نیست؛ هر کسی از صفر شروع می‌کند. ${correctCount} پاسخ درست از ${total} سؤال یعنی بهترین نقطهٔ شروع برای تو سطح «${w}» است. مأموریت‌های ساده و کوتاه این سطح دقیقاً برای تو طراحی شده‌اند؛ با انگیزه جلو برو!`;
}

/* =========================================================
   پرامپت جمع‌بندی نهایی (شخصی‌سازی‌شده با پاسخ‌های واقعی)
   ========================================================= */

export function summaryPrompt(
  field: string,
  okFlags: boolean[],
  asked: string[],
  level: number
): { system: string; user: string } {
  const trackName = FIELD_NAMES[field] ?? field;
  const levelWord = LEVEL_WORDS[level] ?? "پایه";
  const system = `تو مشاور آموزشی هنرستان هستی و در پایان آزمون تعیین سطح رشتهٔ «${trackName}» بازخورد می‌نویسی.
- فارسی روان، ۳ تا ۴ جمله، بدون لیست و بدون markdown و بدون علامت نقل‌قول در ابتدا و انتها.
- خطاب به خود دانش‌آموز («تو»).
- یک جمله دربارهٔ نقاط قوت (با اشاره به موضوع یکی دو سؤال درست) و یک جمله دربارهٔ چیزی که باید بیشتر تمرین کند (با اشاره به موضوع یکی دو سؤال نادرست).
- در پایان یک توصیهٔ عملی کوتاه برای شروع سطح «${levelWord}» بده.
- دربارهٔ عدد امتیاز صحبت نکن و سطح را فقط یک بار در توصیهٔ آخر بیاور.
- هرگز نام، سن یا پایهٔ دانش‌آموز را ذکر نکن.`;
  const lines = okFlags.map(
    (ok, i) => `${ok ? "✅" : "❌"} ${String(asked[i] ?? "").slice(0, 90)}`
  );
  const user = `نتیجهٔ سؤال‌ها:\n${lines.join("\n")}\n\nیک بازخورد کوتاه بنویس.`;
  return { system, user };
}
