/**
 * emoji-sync.mjs — اسکن ایموجی‌های استفاده‌شده در سورس و دانلود نسخهٔ
 * اپل (iOS) آنها به public/emoji/ تا در همهٔ سیستم‌عامل‌ها با ظاهر iOS رندر شوند.
 *
 * منبع اصلی: emojicdn.elk.sh (160px، استایل apple)
 * منبع پشتیبان: emoji-datasource-apple@15.0.1 روی jsDelivr (64px)
 *
 * نام‌گذاری فایل = کدپوینت‌های توالی (hex کوچک، جدا با «-») — دقیقاً همان
 * تابعی که کامپوننت IosEmoji در زمان اجرا محاسبه می‌کند.
 *
 * اجرا: node scripts/emoji-sync.mjs   (یا bun scripts/emoji-sync.mjs)
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "public", "emoji");

/** همان regex که در ios-emoji.tsx استفاده می‌شود */
const EMOJI_SEQ = /(\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*)/gu;

/** این نویسه‌ها گلیف متنیِ رابط کاربری‌اند نه ایموجی رنگی — دست نمی‌زنیم */
const KEEP_TEXT = new Set(["\u2713", "\u2712", "\u2611", "\u2610", "\u2717"]);

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

/** نام فایل محلی از روی خودِ توالی — یکسان با runtime */
export function emojiFileName(seq) {
  return Array.from(seq)
    .map((c) => c.codePointAt(0).toString(16))
    .join("-");
}

async function download(seq) {
  const name = emojiFileName(seq);
  const out = join(OUT, `${name}.png`);
  if (existsSync(out)) return { seq, name, status: "cached" };

  // ۱) emojicdn (۱۶۰px، apple style)
  try {
    const r = await fetch(
      `https://emojicdn.elk.sh/${encodeURIComponent(seq)}?style=apple`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (r.ok) {
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 200 && buf[0] === 0x89 && buf[1] === 0x50) {
        writeFileSync(out, buf);
        return { seq, name, status: "ok-emojicdn", bytes: buf.length };
      }
    }
  } catch {}

  // ۲) jsDelivr — چند ترکیب نام‌گذاری fe0f
  const cps = Array.from(seq).map((c) => c.codePointAt(0).toString(16));
  const noFe0f = cps.filter((c) => c !== "fe0f");
  const candidates = [
    cps.join("-"),
    noFe0f.join("-"),
    [...noFe0f, "fe0f"].join("-"),
  ];
  for (const c of [...new Set(candidates)]) {
    try {
      const r = await fetch(
        `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/${c}.png`,
        { signal: AbortSignal.timeout(15000) }
      );
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > 200 && buf[0] === 0x89) {
          writeFileSync(out, buf);
          return { seq, name, status: "ok-jsdelivr", bytes: buf.length };
        }
      }
    } catch {}
  }
  return { seq, name, status: "MISS" };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const found = new Map(); // seq -> [files]
  for (const f of walk(SRC)) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(EMOJI_SEQ)) {
      const seq = m[1];
      if (KEEP_TEXT.has(seq.replace(/\uFE0F/g, ""))) continue;
      if (!found.has(seq)) found.set(seq, []);
      found.get(seq).push(f.replace(ROOT + "/", ""));
    }
  }
  console.log(`Distinct emoji sequences: ${found.size}`);
  const results = [];
  for (const seq of found.keys()) results.push(await download(seq));
  const miss = results.filter((r) => r.status === "MISS");
  for (const r of results) {
    console.log(
      `${r.status.padEnd(13)} ${r.name}.png  ${r.seq}  <- ${found.get(r.seq).slice(0, 2).join(", ")}`
    );
  }
  if (miss.length) {
    console.error("\nMISSED:", miss.map((m) => `${m.seq} (${m.name})`).join(", "));
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${results.length} emojis saved to public/emoji/`);
  }
}

main();
