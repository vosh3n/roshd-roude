import { smtpConfigured } from "@/lib/mailer";

/**
 * GET /api/config/features — قابلیت‌های فعال (فقط بولین؛ هیچ مقدار محرمانه‌ای نه)
 */
export async function GET() {
  return Response.json({ smtp: smtpConfigured() });
}
