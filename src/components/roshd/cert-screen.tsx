"use client";

import { useRoshd, totalCompleted } from "@/store/roshd";
import { FIELDS, LEVELS, CERT_THRESHOLD } from "@/lib/missions-data";
import { toFa } from "@/lib/jalali";
import { Printer } from "lucide-react";

export default function CertScreen() {
  const curUser = useRoshd((s) => s.curUser);
  const u = curUser();

  if (!u) return null;
  const total = totalCompleted(u);

  return (
    <>
      <div className="card certificate">
        <h2>گواهی افتخار — مسیر رشد</h2>
        <div className="note">این گواهی نشان می‌دهد که</div>
        <div className="cname" id="certName">
          {u.name}
        </div>
        <div className="note" style={{ fontSize: "0.875rem" }} id="certBody">
          در مسیر «{u.field ? FIELDS[u.field].name : ""}» با سطح «
          {u.level ? LEVELS[u.level] : ""}»، مجموعاً {toFa(total)} ماموریت را با
          موفقیت انجام داده است.
        </div>
        <div className="note" style={{ marginTop: "1.125rem" }} id="certDate">
          تاریخ صدور: {new Date().toLocaleDateString("fa-IR")}
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: "1.125rem" }}>
        <button className="btn" onClick={() => window.print()}>
          <Printer size={16} />
          چاپ گواهی
        </button>
      </div>
    </>
  );
}
