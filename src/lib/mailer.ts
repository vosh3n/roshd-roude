/**
 * ارسال ایمیل با nodemailer — فقط برای بازیابی رمز عبور
 *
 * تنظیمات از .env:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE (اختیاری), SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * اگر SMTP تنظیم نشده باشد، hasSmtp()=false و روت forgot کد را
 * در حالت آزمایشی به خود صفحه برمی‌گرداند (تا پروژه بدون سرویس ایمیل هم کار کند).
 */

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE =
  process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "";

/** آیا سرویس ایمیل تنظیم شده؟ */
export function hasSmtp(): boolean {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

export function smtpFrom(): string {
  return SMTP_FROM || SMTP_USER;
}

/** ارسال ایمیل کد بازیابی — در صورت نبود تنظیمات، خطای «no-smtp» می‌دهد */
export async function sendResetCodeEmail(
  to: string,
  code: string
): Promise<void> {
  if (!hasSmtp()) throw new Error("no-smtp");

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: smtpFrom(),
    to,
    subject: "کد بازیابی رمز عبور — مسیر رشد",
    text:
      `سلام!\n\nکد بازیابی رمز عبور تو در «مسیر رشد»:\n\n${code}\n\n` +
      `این کد تا ۱۵ دقیقه اعتبار دارد.\n` +
      `اگر تو این درخواست را ندادی، این ایمیل را نادیده بگیر.`,
    html:
      `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:2">` +
      `<p>سلام!</p>` +
      `<p>کد بازیابی رمز عبور تو در «مسیر رشد»:</p>` +
      `<p style="font-size:2rem;font-weight:800;letter-spacing:.35em;text-align:center">${code}</p>` +
      `<p>این کد تا ۱۵ دقیقه اعتبار دارد.</p>` +
      `<p style="color:#888">اگر تو این درخواست را ندادی، این ایمیل را نادیده بگیر.</p>` +
      `</div>`,
  });
}
