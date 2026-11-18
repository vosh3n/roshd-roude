"use client";

/**
 * انتخاب‌گر تاریخ و ساعت شمسی برای ساخت تکلیف
 */

import { useState } from "react";
import {
  JMONTHS,
  monthLen,
  toJalali,
  toFa,
  jalaliToISO,
} from "@/lib/jalali";

export interface JalaliValue {
  iso: string;
}

export default function JalaliDateTimePicker({
  onChange,
  initial,
  idPrefix = "dp",
}: {
  onChange: (iso: string) => void;
  initial?: Date;
  idPrefix?: string;
}) {
  const initJ = toJalali(initial || new Date());
  const [jy, setJy] = useState(initJ.jy);
  const [jm, setJm] = useState(initJ.jm);
  const [jd, setJd] = useState(initJ.jd);
  const [h, setH] = useState(initJ.h);
  const [mi, setMi] = useState(initJ.mi);

  const years: number[] = [];
  for (let y = initJ.jy - 1; y <= initJ.jy + 4; y++) years.push(y);
  const days: number[] = [];
  const len = monthLen(jy, jm);
  for (let d = 1; d <= len; d++) days.push(d);

  const emit = (njy: number, njm: number, njd: number, nh: number, nmi: number) => {
    onChange(jalaliToISO(njy, njm, Math.min(njd, monthLen(njy, njm)), nh, nmi));
  };

  const changeY = (v: number) => {
    setJy(v);
    emit(v, jm, jd, h, mi);
  };
  const changeM = (v: number) => {
    const m = +v;
    setJm(m);
    const nd = Math.min(jd, monthLen(jy, m));
    setJd(nd);
    emit(jy, m, nd, h, mi);
  };
  const changeD = (v: number) => {
    const d = +v;
    setJd(d);
    emit(jy, jm, d, h, mi);
  };
  const changeH = (v: string) => {
    const n = Math.min(23, Math.max(0, parseInt(v, 10) || 0));
    setH(n);
    emit(jy, jm, jd, n, mi);
  };
  const changeMi = (v: string) => {
    const n = Math.min(59, Math.max(0, parseInt(v, 10) || 0));
    setMi(n);
    emit(jy, jm, jd, h, n);
  };

  return (
    <div className="jalali">
      <select
        aria-label="سال"
        id={idPrefix + "-jy"}
        value={jy}
        onChange={(e) => changeY(+e.target.value)}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {toFa(y)}
          </option>
        ))}
      </select>
      <select
        aria-label="ماه"
        id={idPrefix + "-jm"}
        value={jm}
        onChange={(e) => changeM(e.target.value)}
      >
        {JMONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        aria-label="روز"
        id={idPrefix + "-jd"}
        value={jd}
        onChange={(e) => changeD(e.target.value)}
      >
        {days.map((d) => (
          <option key={d} value={d}>
            {toFa(d)}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={0}
        max={23}
        value={h}
        aria-label="ساعت"
        id={idPrefix + "-jh"}
        onChange={(e) => changeH(e.target.value)}
      />
      <span style={{ alignSelf: "center", fontSize: "0.75rem", color: "var(--muted)" }}>
        ساعت
      </span>
      <input
        type="number"
        min={0}
        max={59}
        value={mi}
        aria-label="دقیقه"
        id={idPrefix + "-jmi"}
        onChange={(e) => changeMi(e.target.value)}
      />
      <span style={{ alignSelf: "center", fontSize: "0.75rem", color: "var(--muted)" }}>
        دقیقه
      </span>
    </div>
  );
}
