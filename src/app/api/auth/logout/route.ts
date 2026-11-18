import { cookies } from "next/headers";
import { db } from "@/lib/db";

export async function POST() {
  const store = await cookies();
  const sid = store.get("sid")?.value;
  if (sid) {
    await db.session.delete({ where: { id: sid } }).catch(() => {});
  }
  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    "sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
  );
  return res;
}
