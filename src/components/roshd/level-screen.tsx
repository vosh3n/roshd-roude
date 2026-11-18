"use client";

import { useRoshd } from "@/store/roshd";
import { LEVEL_INFO } from "@/lib/missions-data";
import LevelChat from "./level-chat";
import { LevelIcon } from "./icons";

export default function LevelScreen() {
  const selectLevel = useRoshd((s) => s.selectLevel);
  const role = useRoshd((s) => s.serverUser?.role);

  return (
    <>
      <div className="card hero">
        <h1>سطحت را با آزمون بسنج</h1>
        <p>
          ۱۲ سؤال چهارگزینه‌ای ازت می‌پرسیم؛ از آسان شروع می‌شود و کم‌کم
          سخت‌تر می‌شود. بر اساس پاسخ‌هایت بهترین سطح شروع را بهت پیشنهاد
          می‌دهیم.
        </p>
      </div>
      <div style={{ height: "1.25rem" }} />
      <LevelChat />
      {role === "admin" && (
        <>
          <div style={{ height: "1.25rem" }} />
          <h2 className="section-title">
            انتخاب دستی سطح — فقط معلم
          </h2>
          <p className="note">
            این بخش فقط برای معلم نمایش داده می‌شود؛ دانش‌آموزها برای تعیین سطح
            حتماً باید آزمون هوشمند را بدهند.
          </p>
          <div className="levels">
            {LEVEL_INFO.map((l) => (
              <div
                key={l.id}
                className="level"
                tabIndex={0}
                role="button"
                aria-label={"انتخاب سطح " + l.title}
                onClick={() => selectLevel(l.id)}
                onKeyDown={(e) => e.key === "Enter" && selectLevel(l.id)}
              >
                <b className="inline-icon">
                  <LevelIcon id={l.id} size={16} />
                  {l.title}
                </b>
                <p>{l.desc}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
