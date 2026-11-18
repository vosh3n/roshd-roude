"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { useRoshd, MISSION_STATUS_TEXT } from "@/store/roshd";
import {
  FIELDS,
  LEVELS,
  MISSION_KIND_HINT,
  MISSION_KIND_TEXT,
  missionKind,
} from "@/lib/missions-data";

/**
 * پنجرهٔ کار روی یک ماموریت:
 * - عملی: آپلود عکس/فایل/ویدیوی کوتاه یا لینک + توضیح کوتاه
 * - مطالعه‌ای: نوشتن خلاصه با کلمات خودِ دانش‌آموز
 * بعد از ارسال: «در انتظار بررسی» و سپس «تایید شده» یا «نیاز به اصلاح» با پیام معلم.
 */
export default function MissionModal() {
  const key = useRoshd((s) => s.missionModalKey);
  const openMission = useRoshd((s) => s.openMission);
  const submitMission = useRoshd((s) => s.submitMission);
  const busy = useRoshd((s) => s.missionBusy);
  const missions = useRoshd((s) => s.missions);

  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const parsed = key ? key.split("_") : [];
  const field = parsed[0] || "";
  const level = parsed[1] || "";
  const day = parsed[2] || "";
  const idx = Number(parsed[3] || 0);
  const sub = key ? missions[key] : undefined;
  const kind = sub?.kind || (field ? missionKind(field, idx) : "practical");
  const title = FIELDS[field]?.missions[idx] || sub?.title || "";

  useEffect(() => {
    if (!key) return;
    setText(sub?.text || "");
    setLink(sub?.link || "");
    setFile(null);
    setErr("");
    const t = setTimeout(() => boxRef.current?.focus(), 40);
    return () => clearTimeout(t);
    // فقط هنگام تغییر ماموریت، فرم از دادهٔ ذخیره‌شده پر شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!key) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && openMission(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, openMission]);

  if (!key) return null;

  const status = sub?.status || "none";
  const locked = status === "pending" || status === "approved";

  const send = async () => {
    setErr("");
    if (!field || !LEVELS[level]) {
      setErr("رشته یا سطح انتخاب نشده است.");
      return;
    }
    if (kind === "reading" && text.trim().length < 15) {
      setErr("خلاصه‌ات را با کلمات خودت بنویس (حداقل ۱۵ نویسه).");
      return;
    }
    if (kind === "practical" && !file && !link.trim() && text.trim().length < 15) {
      setErr("یک فایل یا لینک بفرست، یا کارت را کمی توضیح بده.");
      return;
    }
    await submitMission({
      key,
      field,
      level,
      day,
      idx,
      kind,
      text: text.trim(),
      link: link.trim(),
      file,
    });
  };

  return (
    <div
      className="modal-bg mission-modal-bg"
      role="dialog"
      aria-modal="true"
      aria-label="ماموریت امروز"
      onClick={(e) => {
        if (e.target === e.currentTarget) openMission(null);
      }}
    >
      <div className="modal mission-modal" ref={boxRef} tabIndex={-1}>
        <button
          type="button"
          className="modal-close"
          aria-label="بستن"
          onClick={() => openMission(null)}
        >
          <X size={18} />
        </button>

        <div className="mission-modal-head">
          <span className={"mission-kind " + kind}>{MISSION_KIND_TEXT[kind]}</span>
          <span className={"mission-chip " + status}>{MISSION_STATUS_TEXT[status]}</span>
        </div>

        <h2 className="mission-modal-title">{title}</h2>
        <p className="mission-modal-hint">{MISSION_KIND_HINT[kind]}</p>

        {status === "revision" && sub?.teacherNote ? (
          <div className="teacher-note" role="status">
            <b>
              <MessageSquare size={15} /> پیام معلم
            </b>
            <p>{sub.teacherNote}</p>
          </div>
        ) : null}

        {status === "pending" ? (
          <div className="mission-banner pending">
            <Clock size={16} /> ارسال شد؛ منتظر بررسی معلم باش. می‌توانی وضعیت را
            همین‌جا ببینی.
          </div>
        ) : null}

        {status === "approved" ? (
          <div className="mission-banner approved">
            <CheckCircle2 size={16} /> این ماموریت تایید شد و در آمارت ثبت شد.
            {sub?.teacherNote ? <span> پیام معلم: {sub.teacherNote}</span> : null}
          </div>
        ) : null}

        {sub && (sub.text || sub.link || sub.hasFile) ? (
          <div className="mission-sent">
            <b>ارسال فعلی تو</b>
            {sub.text ? <p className="mission-sent-text">{sub.text}</p> : null}
            {sub.link ? (
              <a
                className="mission-link"
                href={sub.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={14} /> {sub.link}
              </a>
            ) : null}
            {sub.hasFile ? (
              <a
                className="mission-file"
                href={"/api/missions/" + sub.id + "/file?inline=1"}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText size={14} /> {sub.fileName}
              </a>
            ) : null}
            {sub.hasFile && /^image\//.test(sub.fileType) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="mission-thumb"
                src={"/api/missions/" + sub.id + "/file?inline=1"}
                alt="پیش‌نمایش فایل ارسالی"
              />
            ) : null}
          </div>
        ) : null}

        {locked ? null : (
          <div className="mission-form">
            {kind === "practical" ? (
              <>
                <label className="mission-field">
                  <span>فایل یا عکس نتیجه (JPG/PNG/WebP/GIF، PDF یا ویدیو)</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/webm,video/quicktime"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <small>حداکثر ۸ مگابایت عکس، ۱۵ مگابایت PDF، ۵۰ مگابایت ویدیو</small>
                </label>

                <label className="mission-field">
                  <span>یا لینک نتیجه (اختیاری)</span>
                  <input
                    type="url"
                    dir="ltr"
                    placeholder="https://..."
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  />
                </label>

                <label className="mission-field">
                  <span>توضیح کوتاه</span>
                  <textarea
                    rows={3}
                    maxLength={4000}
                    placeholder="چه ساختی؟ چه چیزی یاد گرفتی؟"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </label>
              </>
            ) : (
              <label className="mission-field">
                <span>خلاصه‌ات با کلمات خودت</span>
                <textarea
                  rows={6}
                  maxLength={4000}
                  placeholder="آنچه خواندی یا دیدی را به زبان خودت بنویس…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <small>{text.trim().length} نویسه — حداقل ۱۵ نویسه</small>
              </label>
            )}

            {err ? (
              <div className="error-msg" role="alert">
                {err}
              </div>
            ) : null}

            <button
              type="button"
              className="btn mission-send"
              onClick={send}
              disabled={busy}
            >
              {busy ? (
                <Loader2 size={16} className="spin" />
              ) : status === "revision" ? (
                <RotateCcw size={16} />
              ) : (
                <Send size={16} />
              )}
              {status === "revision" ? "ارسال دوباره برای بررسی" : "ارسال برای بررسی معلم"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
