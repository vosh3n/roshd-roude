"use client";

/**
 * نمایشگاه «کارهای من» — شبکهٔ کارتی کارهای تاییدشده با پیش‌نمایش،
 * نمایش بزرگ (lightbox)، فیلتر رشته و نوع کار.
 * برای دانش‌آموز حالت مدیریت دارد (افزودن/مخفی، عنوان و توضیح، سنجاق).
 * والد/معلم فقط مشاهده می‌کنند؛ دسترسی در سرور بررسی می‌شود.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, useRoshd } from "@/store/roshd";
import { FIELD_THEME } from "@/lib/missions-data";
import { fmtDeadline, toFa } from "@/lib/jalali";
import {
  ArrowUp,
  Award,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import EmptyState from "./empty-state";
import Mascot from "./mascot";

export interface Work {
  id: string;
  sourceType: "mission" | "task";
  sourceId: string;
  title: string;
  description: string;
  field: string;
  kindLabel: string;
  at: string;
  pinned: boolean;
  preview: "image" | "video" | "file" | "text";
  fileUrl: string;
  fileName: string;
}

interface Candidate {
  sourceType: "mission" | "task";
  sourceId: string;
  title: string;
  description: string;
  field: string;
  kindLabel: string;
  at: string;
  inShowcase: boolean;
  hidden: boolean;
  pinned: boolean;
  hasFile: boolean;
  fileName: string;
}

export default function ShowcaseGallery({
  student,
  manage = false,
}: {
  /** نام کاربری دانش‌آموز؛ برای دانش‌آموز خالی = خودش */
  student?: string;
  manage?: boolean;
}) {
  const pushToast = useRoshd((s) => s.pushToast);
  const [works, setWorks] = useState<Work[] | null>(null);
  const [name, setName] = useState("");
  const [field, setField] = useState<string>("");
  const [type, setType] = useState<"all" | "mission" | "task">("all");
  const [open, setOpen] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showManage, setShowManage] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ id: string; title: string; description: string } | null>(null);

  const url = "/api/showcase" + (student ? "?student=" + encodeURIComponent(student) : "");

  const load = useCallback(async () => {
    try {
      const d = await api(url);
      setWorks(d.works || []);
      setName(d.student?.name || "");
      setField(d.student?.field || "");
      if (manage) {
        const c = await api("/api/showcase/candidates");
        setCandidates(c.candidates || []);
      }
    } catch (e) {
      pushToast((e as Error).message);
      setWorks([]);
    }
  }, [url, manage, pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const all = works || [];
  const visible = all.filter(
    (w) => (type === "all" || w.sourceType === type) && (!field || w.field === field)
  );

  const fields = useMemo(
    () => Array.from(new Set(all.map((w) => w.field).filter(Boolean))),
    [all]
  );

  const toggle = async (c: Candidate) => {
    setBusy(c.sourceType + c.sourceId);
    try {
      if (c.inShowcase) {
        const existing = all.find(
          (w) => w.sourceType === c.sourceType && w.sourceId === c.sourceId
        );
        if (existing) await api(`/api/showcase/${existing.id}`, { method: "DELETE" });
        pushToast("کار از نمایشگاه برداشته شد.");
      } else {
        await api("/api/showcase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceType: c.sourceType,
            sourceId: c.sourceId,
            title: c.title,
            description: c.description,
          }),
        });
        pushToast("کار به نمایشگاه اضافه شد.");
      }
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const patchWork = async (id: string, body: Record<string, unknown>) => {
    setBusy(id);
    try {
      await api(`/api/showcase/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
      return true;
    } catch (e) {
      pushToast((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="showcase-wrap">
      <div className="showcase-head card">
        <span className="showcase-spark" aria-hidden="true">
          <Sparkles size={22} />
        </span>
        <div>
          <b>نمایشگاه کارهای {manage ? "من" : name || ""}</b>
          <small>
            {all.length
              ? `${toFa(all.length)} کار تاییدشده — ساخته‌شده با تلاش و ذوق`
              : "هر کار تاییدشده می‌تواند این‌جا بدرخشد"}
          </small>
        </div>
        {manage ? (
          <button
            type="button"
            className="btn secondary showcase-manage-btn"
            onClick={() => setShowManage((v) => !v)}
          >
            <Pencil size={15} /> {showManage ? "بستن مدیریت" : "مدیریت کارها"}
          </button>
        ) : null}
      </div>

      {works === null ? (
        <div className="calm-loading">
          <Loader2 size={18} className="spin" /> در حال چیدن قاب‌ها…
        </div>
      ) : works.length === 0 ? (
        <div className="showcase-empty">
          <Mascot
            text={
              manage
                ? "اولین کارت را تایید کن؛ بعد همین‌جا قابش می‌کنیم. نمایشگاه با یک کار کوچک شروع می‌شود."
                : "هنوز کاری در نمایشگاه نیست؛ به‌زودی اولین قاب این‌جا آویزان می‌شود."
            }
            mood="think"
            size={70}
          />
          <EmptyState
            title="نمایشگاه هنوز خالی است"
            hint={
              manage
                ? "از دکمهٔ «مدیریت کارها» کارهای تاییدشده‌ات را انتخاب کن."
                : "کارهای تاییدشدهٔ دانش‌آموز خودکار این‌جا نشان داده می‌شوند."
            }
            icon={<ImageIcon size={26} />}
          />
        </div>
      ) : (
        <>
          <div className="showcase-filters" role="group" aria-label="فیلتر نمایشگاه">
            <button
              type="button"
              className={"showcase-chip" + (type === "all" ? " active" : "")}
              onClick={() => setType("all")}
            >
              همه
            </button>
            <button
              type="button"
              className={"showcase-chip" + (type === "mission" ? " active" : "")}
              onClick={() => setType("mission")}
            >
              ماموریت‌ها
            </button>
            <button
              type="button"
              className={"showcase-chip" + (type === "task" ? " active" : "")}
              onClick={() => setType("task")}
            >
              تکالیف
            </button>
            {fields.map((f) => (
              <button
                key={f}
                type="button"
                className={"showcase-chip field" + (field === f ? " active" : "")}
                style={{ ["--chip" as string]: FIELD_THEME[f]?.color || "var(--accent)" }}
                onClick={() => setField(field === f ? "" : f)}
              >
                {FIELD_THEME[f]?.label || f}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              title="با این فیلتر کاری نیست"
              hint="فیلتر را بردار یا «همه» را بزن تا بقیهٔ قاب‌ها را ببینی."
              icon={<ImageIcon size={26} />}
            />
          ) : (
            <div className="showcase-grid">
              {visible.map((w, i) => (
                <article
                  key={w.id}
                  className={
                    "showcase-card" +
                    (w.pinned ? " pinned" : "") +
                    (w.preview === "text" ? " texty" : "")
                  }
                  style={{
                    ["--card-a" as string]: FIELD_THEME[w.field]?.color || "var(--accent)",
                    ["--card-b" as string]: FIELD_THEME[w.field]?.second || "var(--accent2)",
                  }}
                >
                  <button
                    type="button"
                    className="showcase-frame"
                    onClick={() => setOpen(i)}
                    aria-label={`نمایش بزرگ ${w.title}`}
                  >
                    {w.preview === "image" && w.fileUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.fileUrl} alt={w.title} loading="lazy" />
                    ) : w.preview === "video" && w.fileUrl ? (
                      <video src={w.fileUrl} muted playsInline preload="metadata" />
                    ) : (
                      <span className="showcase-textart">{w.description || w.title}</span>
                    )}
                    {w.pinned ? (
                      <span className="showcase-pin" title="سنجاق‌شده">
                        <Pin size={13} />
                      </span>
                    ) : null}
                  </button>

                  <div className="showcase-body">
                    <b>{w.title}</b>
                    <small>
                      {w.kindLabel} · {fmtDeadline(w.at)}
                    </small>
                    {w.description ? <p>{w.description}</p> : null}
                    <div className="showcase-tags">
                      {w.field ? (
                        <span className="showcase-tag">
                          {FIELD_THEME[w.field]?.label || w.field}
                        </span>
                      ) : null}
                      <span className="showcase-tag soft">{w.kindLabel}</span>
                    </div>
                  </div>

                  {manage ? (
                    <div className="showcase-card-actions">
                      <button
                        type="button"
                        className="iconbtn"
                        title={w.pinned ? "برداشتن سنجاق" : "سنجاق کردن"}
                        aria-label={w.pinned ? "برداشتن سنجاق" : "سنجاق کردن"}
                        disabled={busy === w.id}
                        onClick={() => patchWork(w.id, { pinned: !w.pinned })}
                      >
                        {w.pinned ? <PinOff size={15} /> : <ArrowUp size={15} />}
                      </button>
                      <button
                        type="button"
                        className="iconbtn"
                        title="ویرایش عنوان و توضیح"
                        aria-label="ویرایش کار"
                        onClick={() =>
                          setEdit({
                            id: w.id,
                            title: w.title,
                            description: w.description,
                          })
                        }
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="iconbtn"
                        title="پنهان کردن از نمایشگاه"
                        aria-label="پنهان کردن"
                        disabled={busy === w.id}
                        onClick={() => patchWork(w.id, { hidden: true })}
                      >
                        <EyeOff size={15} />
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* مدیریت: کارهای تاییدشده */}
      {manage && showManage ? (
        <div className="card showcase-manage">
          <h3 className="gallery-title">
            <Award size={17} /> کارهای تاییدشدهٔ من
          </h3>
          <p className="note">
            هر کاری که معلم یا نماینده تایید کرده، می‌تواند قاب نمایشگاه شود. حداکثر ۶ کار را
            می‌توانی سنجاق کنی.
          </p>
          {candidates.length === 0 ? (
            <p className="note">هنوز کار تاییدشده‌ای نداری — اولین ماموریتت را بفرست.</p>
          ) : (
            <ul className="showcase-candidates">
              {candidates.map((c) => {
                const key = c.sourceType + c.sourceId;
                return (
                  <li key={key}>
                    <span className="cand-title">
                      <b>{c.title}</b>
                      <small>
                        {c.kindLabel} · {fmtDeadline(c.at)}
                      </small>
                    </span>
                    {c.inShowcase ? (
                      <span className="cand-state">
                        {c.hidden ? "پنهان" : <><Eye size={13} /> در نمایشگاه</>}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className={"btn " + (c.inShowcase && !c.hidden ? "secondary" : "")}
                      disabled={busy === key}
                      onClick={() => toggle(c)}
                    >
                      {busy === key ? (
                        <Loader2 size={15} className="spin" />
                      ) : c.inShowcase && !c.hidden ? (
                        <EyeOff size={15} />
                      ) : (
                        <Plus size={15} />
                      )}
                      {c.inShowcase && !c.hidden ? "برداشتن" : "افزودن"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {open !== null && visible[open] ? (
        <div
          className="showcase-light"
          role="dialog"
          aria-modal="true"
          aria-label={visible[open].title}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(null);
          }}
        >
          <button
            type="button"
            className="lightbox-close"
            aria-label="بستن"
            onClick={() => setOpen(null)}
          >
            <X size={20} />
          </button>
          <button
            type="button"
            className="lightbox-nav prev"
            aria-label="کار قبلی"
            onClick={() => setOpen((open - 1 + visible.length) % visible.length)}
          >
            <ChevronRight size={22} />
          </button>
          <figure className="showcase-big">
            {visible[open].preview === "image" && visible[open].fileUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={visible[open].fileUrl} alt={visible[open].title} />
            ) : visible[open].preview === "video" && visible[open].fileUrl ? (
              <video src={visible[open].fileUrl} controls autoPlay playsInline />
            ) : (
              <div className="showcase-big-text">
                <p>{visible[open].description || visible[open].title}</p>
                {visible[open].fileUrl ? (
                  <a
                    className="btn secondary"
                    href={visible[open].fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    دیدن فایل کار
                  </a>
                ) : null}
              </div>
            )}
            <figcaption>
              <b>{visible[open].title}</b>
              <span>
                {visible[open].kindLabel} · {fmtDeadline(visible[open].at)}
              </span>
              {visible[open].description ? <p>{visible[open].description}</p> : null}
              <span className="lightbox-count">
                {toFa(open + 1)} از {toFa(visible.length)}
              </span>
            </figcaption>
          </figure>
          <button
            type="button"
            className="lightbox-nav next"
            aria-label="کار بعدی"
            onClick={() => setOpen((open + 1) % visible.length)}
          >
            <ChevronLeft size={22} />
          </button>
        </div>
      ) : null}

      {edit ? (
        <div className="showcase-edit-back" role="dialog" aria-modal="true">
          <div className="card showcase-edit">
            <h3 className="gallery-title">عنوان و توضیح کار</h3>
            <label className="mission-field">
              <span>عنوان</span>
              <input
                type="text"
                maxLength={80}
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </label>
            <label className="mission-field">
              <span>توضیح کوتاه</span>
              <textarea
                rows={3}
                maxLength={300}
                placeholder="چه چیزی ساختی و چه چیزی یاد گرفتی؟"
                value={edit.description}
                onChange={(e) => setEdit({ ...edit, description: e.target.value })}
              />
            </label>
            <div className="admin-row-actions">
              <button
                type="button"
                className="btn"
                disabled={busy === edit.id}
                onClick={async () => {
                  if (
                    await patchWork(edit.id, {
                      title: edit.title,
                      description: edit.description,
                    })
                  ) {
                    pushToast("ذخیره شد.");
                    setEdit(null);
                  }
                }}
              >
                <Pencil size={15} /> ذخیره
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setEdit(null)}
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
