import { currentUser } from "@/lib/auth";
import { ensureAdmin } from "@/lib/bootstrap";

export async function GET() {
  // هر بار باز شدن سایت، حساب مدیر اصلی تضمین می‌شود
  await ensureAdmin();
  const user = await currentUser();
  return Response.json({ user });
}
