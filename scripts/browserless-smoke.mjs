#!/usr/bin/env node
/**
 * browserless-smoke.mjs — نمونهٔ حداقلی و قابل‌اجرای اتصال Playwright به
 * مرورگر ابری Browserless (بستهٔ playwright-core، پروتکل CDP روی WebSocket).
 *
 * به‌جای اجرای مرورگر روی همین سیستم، مرورگر مدیریت‌شدهٔ Browserless اجرا
 * می‌شود و نتیجه از راه همان WebSocket برمی‌گردد؛ پس به نصب مرورگر محلی
 * نیازی نیست.
 *
 * اجرا (از پوشهٔ پروژه):
 *   npm run browserless:check
 *   node scripts/browserless-smoke.mjs https://example.com/
 *
 * متغیرهای محیطی (.env یا محیط):
 *   BROWSERLESS_TOKEN     (الزامی) توکن حساب Browserless — هرگز کامیت نمی‌شود
 *   BROWSERLESS_ENDPOINT  (اختیاری) پیش‌فرض: wss://production-sfo.browserless.io
 *
 * خروجی: پاسخ Browserless (کد وضعیت و عنوان صفحه) یا پیام خطای روشن.
 * توکن در هیچ خروجی یا لاگی چاپ نمی‌شود.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const DEFAULT_ENDPOINT = "wss://production-sfo.browserless.io";
const DEFAULT_URL = "https://example.com/";

/* ---------- بارگذاری .env اگر متغیر محیطی تنظیم نباشد ---------- */
function loadEnvFile() {
  const file = path.join(process.cwd(), ".env");
  if (!fs.existsSync(file)) return;
  const raw = fs.readFileSync(file, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

function tokenFromEnv() {
  return (process.env.BROWSERLESS_TOKEN || "").trim();
}

/** نشانی CDP مرورگر ابری؛ توکن فقط در query string قرار می‌گیرد */
function endpointFor(token) {
  const base = (process.env.BROWSERLESS_ENDPOINT || DEFAULT_ENDPOINT).trim();
  const url = new URL(base);
  url.searchParams.set("token", token);
  return url.toString();
}

/** پیام‌های خطای Playwright می‌توانند نشانی کامل (همراه توکن) را داشته باشند */
function redact(text, token) {
  const s = String(text ?? "");
  return token ? s.split(token).join("***") : s;
}

async function main() {
  loadEnvFile();

  const token = tokenFromEnv();
  const targetUrl = (process.argv[2] || DEFAULT_URL).trim();

  if (!token) {
    console.error("✗ BROWSERLESS_TOKEN تنظیم نشده است.");
    console.error(
      "  توکن را از https://browserless.io/account/ بگیر و در .env بگذار: BROWSERLESS_TOKEN=…"
    );
    process.exitCode = 1;
    return;
  }

  const endpoint = endpointFor(token);
  console.log(`→ اتصال به مرورگر ابری Browserless (${new URL(endpoint).host}) …`);

  let browser;
  try {
    browser = await chromium.connectOverCDP(endpoint);
    const context = await browser.newContext();
    const page = await context.newPage();
    const response = await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const title = ((await page.title()) || "").trim();

    console.log(`✓ Browserless پاسخ داد — ${targetUrl}`);
    console.log(`  کد وضعیت: ${response ? response.status() : "—"}`);
    console.log(`  عنوان صفحه: ${title || "(بدون عنوان)"}`);
    await context.close();
  } finally {
    if (browser) await browser.close();
  }
}

main().catch((err) => {
  console.error(
    "✗ اتصال به Browserless ناموفق بود:",
    redact(err && err.message ? err.message : err, tokenFromEnv())
  );
  process.exitCode = 1;
});