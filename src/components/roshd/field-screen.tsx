"use client";

import { useRoshd } from "@/store/roshd";
import { FIELDS } from "@/lib/missions-data";
import { FieldIcon } from "./icons";

const CHOICES = [
  { id: "computer", title: "کامپیوتر", desc: "برنامه‌نویسی، شبکه، وب و مهارت‌های فنی" },
  { id: "animation", title: "انیمیشن", desc: "طراحی، حرکت، داستان و ساخت انیمیشن" },
  { id: "graphic", title: "گرافیک", desc: "طراحی، رنگ، تایپوگرافی و هویت بصری" },
  { id: "tv", title: "تولید برنامه تلویزیونی", desc: "ایده، فیلم‌برداری، تدوین و تولید محتوا" },
];

export default function FieldScreen() {
  const selectField = useRoshd((s) => s.selectField);
  const curUser = useRoshd((s) => s.curUser);
  const u = curUser();

  return (
    <>
      <div className="card hero">
        <h1>اول رشته‌ات را انتخاب کن</h1>
        <p>
          چهار مسیر داری. بعد از انتخاب رشته، سطح خودت رو مشخص می‌کنی و سایت هر
          روز ۴ ماموریت مخصوص همان مسیر بهت می‌دهد.
        </p>
      </div>
      <div style={{ height: "1.25rem" }} />
      <h2 className="section-title">انتخاب رشته</h2>
      <div className="grid" role="list">
        {CHOICES.map((c) => (
          <div
            key={c.id}
            className="choice"
            role="listitem"
            tabIndex={0}
            aria-label={"انتخاب رشته " + c.title}
            onClick={() => selectField(c.id)}
            onKeyDown={(e) => e.key === "Enter" && selectField(c.id)}
          >
            <div className="icon">
              <FieldIcon id={c.id} size={26} />
            </div>
            <b>{c.title}</b>
            <small>{c.desc}</small>
          </div>
        ))}
      </div>
      {u?.field ? (
        <p className="note">
          رشته فعلی تو: {FIELDS[u.field].name} — برای تغییر روی رشته دیگر کلیک
          کن.
        </p>
      ) : null}
    </>
  );
}
