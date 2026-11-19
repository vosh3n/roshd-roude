"use client";

/**
 * صفحهٔ «نمایشگاه کارهای من» برای دانش‌آموز و نمایشگاه هر دانش‌آموز برای
 * معلم و مدیر سایت (با انتخاب‌گر دانش‌آموز). والد از تب پنل خودش می‌بیند و
 * نمایندهٔ آموزشی هیچ دسترسی‌ای ندارد (سرور هم ۴۰۳ می‌دهد).
 */

import { useEffect, useState } from "react";
import { api, useRoshd } from "@/store/roshd";
import { Loader2, Sparkles } from "lucide-react";
import ShowcaseGallery from "./showcase-gallery";

interface StudentOption {
  username: string;
  name: string;
}

export default function ShowcaseScreen() {
  const serverUser = useRoshd((s) => s.serverUser);
  const pushToast = useRoshd((s) => s.pushToast);
  const [students, setStudents] = useState<StudentOption[] | null>(null);
  const [picked, setPicked] = useState("");

  const isStudent = serverUser?.role === "student";

  useEffect(() => {
    if (isStudent) return;
    api("/api/admin/submissions")
      .then((d) => {
        const list: StudentOption[] = d.students || [];
        setStudents(list);
        setPicked(list[0]?.username || "");
      })
      .catch((e) => {
        pushToast((e as Error).message);
        setStudents([]);
      });
  }, [isStudent, pushToast]);

  if (isStudent) {
    return (
      <div className="showcase-page" dir="rtl">
        <h2 className="section-title">
          <Sparkles size={19} /> نمایشگاه کارهای من
        </h2>
        <p className="note">
          کارهای تاییدشده‌ات را این‌جا قاب کن؛ عنوان و توضیح بنویس و بهترین‌ها را
          سنجاق کن. فقط خودت و معلم و والدت این صفحه را می‌بینند.
        </p>
        <ShowcaseGallery manage />
      </div>
    );
  }

  return (
    <div className="showcase-page" dir="rtl">
      <h2 className="section-title">
        <Sparkles size={19} /> نمایشگاه دانش‌آموزان
      </h2>
      <p className="note">
        نمایشگاه هر دانش‌آموز فقط برای معلم و مدیر سایت قابل مشاهده است.
      </p>

      {students === null ? (
        <div className="calm-loading">
          <Loader2 size={18} className="spin" /> در حال خواندن دانش‌آموزان…
        </div>
      ) : students.length === 0 ? (
        <div className="card empty">هنوز دانش‌آموزی ثبت نشده است.</div>
      ) : (
        <>
          <label className="sa-mini showcase-pick">
            <span>دانش‌آموز</span>
            <select
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
              aria-label="انتخاب دانش‌آموز"
            >
              {students.map((s) => (
                <option key={s.username} value={s.username}>
                  {s.name} (@{s.username})
                </option>
              ))}
            </select>
          </label>
          {picked ? <ShowcaseGallery key={picked} student={picked} /> : null}
        </>
      )}
    </div>
  );
}
