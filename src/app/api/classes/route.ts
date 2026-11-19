import { db } from "@/lib/db";

/**
 * GET /api/classes — فهرست کلاس‌های فعال برای انتخاب هنگام ثبت‌نام.
 * عمداً بدون احراز هویت است (فرم ثبت‌نام قبل از ورود کلاس را نشان می‌دهد)
 * و فقط نام/سال برمی‌گرداند؛ هیچ داده‌ای از دانش‌آموزان لو نمی‌رود.
 */
export async function GET() {
  const classes = await db.schoolClass.findMany({
    where: { active: true },
    select: { id: true, name: true, year: true },
    orderBy: { name: "asc" },
    take: 200,
  });
  return Response.json({ classes });
}
