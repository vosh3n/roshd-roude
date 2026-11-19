"use client";

/**
 * پنل مدیریت سایت (superadmin) و بخش مدیریتی معلم
 * - مدیر سایت: گالری، اطلاعیه‌ها، تقویم، پیام‌ها، اتصال اولیا به فرزند
 * - معلم: اطلاعیه‌ها و پیام‌ها
 * همهٔ بررسی‌های دسترسی سمت سرور هم انجام می‌شود؛ این فقط رابط کاربری است.
 */

import { useCallback, useEffect, useState } from "react";
import { api, useRoshd } from "@/store/roshd";
import { fmtDeadline, toFa } from "@/lib/jalali";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Images,
  Loader2,
  Megaphone,
  MessageCircle,
  Pencil,
  Plus,
  Save,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import EmptyState from "./empty-state";
import SchoolGallery from "./school-gallery";

type Tab = "gallery" | "news" | "calendar" | "messages" | "families";

interface AdminAlbum {
  id: string;
  title: string;
  description: string;
  cover: string;
  photos: { id: string; url: string; caption: string }[];
}

interface NewsRow {
  id: string;
  title: string;
  body: string;
  important: boolean;
  createdAt: string;
}

interface EventRow {
  id: string;
  title: string;
  description: string;
  kind: string;
  startsAt: string;
}

interface InboxRow {
  id: string;
  subject: string;
  body: string;
  reply: string;
  status: string;
  createdAt: string;
  parentName: string;
  parentUsername: string;
}

const EVENT_KINDS = [
  { id: "meeting", label: "جلسهٔ اولیا" },
  { id: "exam", label: "امتحان" },
  { id: "trip", label: "اردو" },
  { id: "holiday", label: "تعطیلی" },
  { id: "event", label: "رویداد" },
];

/** datetime-local → ISO */
function localToIso(v: string) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}
function isoToLocal(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function AdminPanelScreen() {
  const serverUser = useRoshd((s) => s.serverUser);
  const pushToast = useRoshd((s) => s.pushToast);
  const isSuper = serverUser?.role === "superadmin";

  /* مدیر سایت، محتوای پنل اولیا را مدیریت می‌کند؛ صندوق پیام‌ها در
     «پنل معلم» است. معلم همان اطلاعیه‌ها و پیام‌های خودش را دارد. */
  const tabs: { id: Tab; label: string; Icon: typeof Images }[] = isSuper
    ? [
        { id: "gallery", label: "مدیریت گالری", Icon: Images },
        { id: "news", label: "اطلاعیه‌ها", Icon: Megaphone },
        { id: "calendar", label: "تقویم مدرسه", Icon: CalendarDays },
        { id: "families", label: "اتصال اولیا", Icon: Users },
      ]
    : [
        { id: "news", label: "اطلاعیه‌ها", Icon: Megaphone },
        { id: "messages", label: "صندوق پیام‌ها", Icon: MessageCircle },
      ];

  const [tab, setTab] = useState<Tab>(isSuper ? "gallery" : "news");

  return (
    <div className="admin-wrap calm-admin" dir="rtl">
      <div className="page-head">
        <h2 className="section-title">
          {isSuper ? "پنل اولیا" : "اطلاعیه‌ها و پیام‌ها"}
        </h2>
        <p className="note">
          {isSuper
            ? "گالری مدرسه، اطلاعیه‌ها، تقویم و اتصال اولیا به فرزند — همان چیزی که اولیا می‌بینند."
            : "اطلاعیه‌های مدرسه و پیام‌های اولیا را از همین‌جا مدیریت کن."}
        </p>
      </div>

      <div className="parent-tabs admin-tabs" role="tablist" aria-label="بخش‌های مدیریت">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={"parent-tab" + (tab === id ? " active" : "")}
            onClick={() => setTab(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === "gallery" && isSuper ? <GalleryAdmin pushToast={pushToast} /> : null}
      {tab === "news" ? <NewsAdmin pushToast={pushToast} /> : null}
      {tab === "calendar" && isSuper ? <CalendarAdmin pushToast={pushToast} /> : null}
      {tab === "messages" ? <Inbox pushToast={pushToast} /> : null}
      {tab === "families" && isSuper ? <Families pushToast={pushToast} /> : null}
    </div>
  );
}

type Toast = (text: string) => void;

/* ---------------- گالری ---------------- */

function GalleryAdmin({ pushToast }: { pushToast: Toast }) {
  const [albums, setAlbums] = useState<AdminAlbum[] | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCover, setEditCover] = useState<File | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api("/api/admin/gallery");
      setAlbums(d.albums || []);
    } catch (e) {
      pushToast((e as Error).message);
      setAlbums([]);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (title.trim().length < 2) {
      pushToast("عنوان آلبوم را بنویس.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", desc);
      if (cover) fd.append("cover", cover);
      if (photos) Array.from(photos).forEach((f) => fd.append("files", f));
      await api("/api/admin/gallery", { method: "POST", body: fd });
      setTitle("");
      setDesc("");
      setCover(null);
      setPhotos(null);
      pushToast("آلبوم ساخته شد.");
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (id: string) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", editTitle);
      fd.append("description", editDesc);
      if (editCover) fd.append("cover", editCover);
      await api("/api/admin/gallery/" + id, { method: "PATCH", body: fd });
      setEditId(null);
      setEditCover(null);
      pushToast("آلبوم ویرایش شد.");
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("این آلبوم و همهٔ عکس‌هایش حذف شود؟")) return;
    try {
      await api("/api/admin/gallery/" + id, { method: "DELETE" });
      pushToast("آلبوم حذف شد.");
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    }
  };

  const addPhotos = async (id: string, files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      await api("/api/admin/gallery/" + id + "/photos", {
        method: "POST",
        body: fd,
      });
      pushToast(`${toFa(files.length)} عکس اضافه شد.`);
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const deletePhoto = async (albumId: string, photoId: string) => {
    try {
      await api(
        `/api/admin/gallery/${albumId}/photos?photo=${encodeURIComponent(photoId)}`,
        { method: "DELETE" }
      );
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    }
  };

  const movePhoto = async (album: AdminAlbum, index: number, dir: -1 | 1) => {
    const ids = album.photos.map((p) => p.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    try {
      await api(`/api/admin/gallery/${album.id}/photos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: ids }),
      });
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    }
  };

  const moveAlbum = async (index: number, dir: -1 | 1) => {
    if (!albums) return;
    const ids = albums.map((a) => a.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    try {
      await api("/api/admin/gallery/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    }
  };

  return (
    <div className="admin-gallery">
      <div className="card admin-card">
        <h3 className="gallery-title">
          <Plus size={17} /> آلبوم تازه
        </h3>
        <div className="admin-form">
          <label className="mission-field">
            <span>عنوان آلبوم</span>
            <input
              type="text"
              maxLength={120}
              placeholder="مثلاً: اردوی کتابخانه"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="mission-field">
            <span>توضیح کوتاه</span>
            <textarea
              rows={2}
              maxLength={600}
              placeholder="یک جمله‌ی صمیمی دربارهٔ این آلبوم"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </label>
          <label className="mission-field">
            <span>کاور (اختیاری — JPG/PNG/WebP تا ۵ مگابایت)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setCover(e.target.files?.[0] || null)}
            />
          </label>
          <label className="mission-field">
            <span>عکس‌های آلبوم (چند فایل هم‌زمان)</span>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhotos(e.target.files)}
            />
          </label>
          <button
            type="button"
            className="btn"
            onClick={create}
            disabled={busy}
          >
            {busy ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
            ساخت آلبوم
          </button>
        </div>
      </div>

      <div className="admin-gallery-head">
        <h3 className="gallery-title">آلبوم‌ها</h3>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setPreview((p) => !p)}
        >
          <Eye size={16} /> {preview ? "بستن پیش‌نمایش" : "پیش‌نمایش اولیا"}
        </button>
      </div>

      {preview ? (
        <div className="admin-preview card">
          <div className="admin-preview-label">این همان چیزی است که اولیا می‌بینند</div>
          <SchoolGallery />
        </div>
      ) : null}

      {albums === null ? (
        <div className="calm-loading">
          <Loader2 size={18} className="spin" /> در حال خواندن…
        </div>
      ) : albums.length === 0 ? (
        <EmptyState
          title="هنوز آلبومی نساخته‌ای"
          hint="با فرم بالا اولین آلبوم گالری مدرسه را بساز."
          icon={<Images size={26} />}
        />
      ) : (
        <div className="admin-albums">
          {albums.map((a, i) => (
            <article key={a.id} className="card admin-album">
              <div className="admin-album-top">
                <span className="admin-album-cover">
                  {a.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.cover} alt="" loading="lazy" />
                  ) : (
                    <Images size={22} />
                  )}
                </span>
                {editId === a.id ? (
                  <div className="admin-album-edit">
                    <input
                      type="text"
                      value={editTitle}
                      maxLength={120}
                      onChange={(e) => setEditTitle(e.target.value)}
                      aria-label="عنوان آلبوم"
                    />
                    <textarea
                      rows={2}
                      value={editDesc}
                      maxLength={600}
                      onChange={(e) => setEditDesc(e.target.value)}
                      aria-label="توضیح آلبوم"
                    />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setEditCover(e.target.files?.[0] || null)}
                    />
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="btn"
                        disabled={busy}
                        onClick={() => saveEdit(a.id)}
                      >
                        <Save size={15} /> ذخیره
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => setEditId(null)}
                      >
                        انصراف
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-album-body">
                    <b>{a.title}</b>
                    {a.description ? <p>{a.description}</p> : null}
                    <small>{toFa(a.photos.length)} عکس</small>
                  </div>
                )}

                <div className="admin-row-actions">
                  <button
                    type="button"
                    className="iconbtn"
                    aria-label="بالا"
                    disabled={i === 0}
                    onClick={() => moveAlbum(i, -1)}
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    className="iconbtn"
                    aria-label="پایین"
                    disabled={i === albums.length - 1}
                    onClick={() => moveAlbum(i, 1)}
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    type="button"
                    className="iconbtn"
                    aria-label="ویرایش"
                    onClick={() => {
                      setEditId(a.id);
                      setEditTitle(a.title);
                      setEditDesc(a.description);
                      setEditCover(null);
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="iconbtn danger"
                    aria-label="حذف آلبوم"
                    onClick={() => remove(a.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="admin-photo-strip">
                {a.photos.map((p, pi) => (
                  <div key={p.id} className="admin-photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.caption || ""} loading="lazy" />
                    <div className="admin-photo-tools">
                      <button
                        type="button"
                        aria-label="جابه‌جایی به راست"
                        disabled={pi === 0}
                        onClick={() => movePhoto(a, pi, -1)}
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        type="button"
                        aria-label="حذف عکس"
                        onClick={() => deletePhoto(a.id, p.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        type="button"
                        aria-label="جابه‌جایی به چپ"
                        disabled={pi === a.photos.length - 1}
                        onClick={() => movePhoto(a, pi, 1)}
                      >
                        <ChevronDown size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                <label className="admin-photo-add">
                  <Plus size={18} />
                  <span>افزودن عکس</span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => addPhotos(a.id, e.target.files)}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- اطلاعیه‌ها ---------------- */

export function NewsAdmin({ pushToast }: { pushToast: Toast }) {
  const [rows, setRows] = useState<NewsRow[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [important, setImportant] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api("/api/admin/announcements");
      setRows(d.items || []);
    } catch (e) {
      pushToast((e as Error).message);
      setRows([]);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const reset = () => {
    setTitle("");
    setBody("");
    setImportant(false);
    setEditing(null);
  };

  const save = async () => {
    if (title.trim().length < 2) return pushToast("عنوان اطلاعیه را بنویس.");
    if (body.trim().length < 3) return pushToast("متن اطلاعیه خیلی کوتاه است.");
    setBusy(true);
    try {
      if (editing) {
        await api("/api/admin/announcements/" + editing, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, important }),
        });
        pushToast("اطلاعیه ویرایش شد.");
      } else {
        await api("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, important }),
        });
        pushToast("اطلاعیه منتشر شد.");
      }
      reset();
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("این اطلاعیه حذف شود؟")) return;
    try {
      await api("/api/admin/announcements/" + id, { method: "DELETE" });
      pushToast("حذف شد.");
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    }
  };

  return (
    <div className="admin-news">
      <div className="card admin-card">
        <h3 className="gallery-title">
          {editing ? <Pencil size={17} /> : <Plus size={17} />}
          {editing ? "ویرایش اطلاعیه" : "اطلاعیهٔ تازه"}
        </h3>
        <div className="admin-form">
          <label className="mission-field">
            <span>عنوان</span>
            <input
              type="text"
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="mission-field">
            <span>متن</span>
            <textarea
              rows={4}
              maxLength={3000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={important}
              onChange={(e) => setImportant(e.target.checked)}
            />
            <span>
              <Bell size={14} /> مهم — با نشان فوری برای اولیا نمایش داده شود
            </span>
          </label>
          <div className="admin-row-actions">
            <button type="button" className="btn" onClick={save} disabled={busy}>
              {busy ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              {editing ? "ذخیرهٔ تغییر" : "انتشار"}
            </button>
            {editing ? (
              <button type="button" className="btn secondary" onClick={reset}>
                انصراف
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {rows === null ? (
        <div className="calm-loading">
          <Loader2 size={18} className="spin" /> در حال خواندن…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="هنوز اطلاعیه‌ای منتشر نشده"
          hint="اولین خبر مدرسه را با فرم بالا بنویس."
          icon={<Megaphone size={26} />}
        />
      ) : (
        <div className="news-list">
          {rows.map((n) => (
            <article
              key={n.id}
              className={"news-card card" + (n.important ? " important" : "")}
            >
              <header className="news-head">
                <b>{n.title}</b>
                {n.important ? (
                  <span className="news-flag">
                    <Bell size={12} /> مهم
                  </span>
                ) : null}
              </header>
              <p className="news-body">{n.body}</p>
              <div className="news-foot">
                <span className="news-date">{fmtDeadline(n.createdAt)}</span>
                <div className="admin-row-actions">
                  <button
                    type="button"
                    className="iconbtn"
                    aria-label="ویرایش"
                    onClick={() => {
                      setEditing(n.id);
                      setTitle(n.title);
                      setBody(n.body);
                      setImportant(n.important);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className="iconbtn danger"
                    aria-label="حذف"
                    onClick={() => remove(n.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- تقویم ---------------- */

function CalendarAdmin({ pushToast }: { pushToast: Toast }) {
  const [rows, setRows] = useState<EventRow[] | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [kind, setKind] = useState("meeting");
  const [when, setWhen] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api("/api/admin/events");
      setRows(d.items || []);
    } catch (e) {
      pushToast((e as Error).message);
      setRows([]);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const reset = () => {
    setTitle("");
    setDesc("");
    setKind("meeting");
    setWhen("");
    setEditing(null);
  };

  const save = async () => {
    if (title.trim().length < 2) return pushToast("عنوان رویداد را بنویس.");
    const iso = localToIso(when);
    if (!iso) return pushToast("تاریخ و ساعت رویداد را انتخاب کن.");
    setBusy(true);
    try {
      const payload = JSON.stringify({
        title,
        description: desc,
        kind,
        startsAt: iso,
      });
      if (editing) {
        await api("/api/admin/events/" + editing, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        pushToast("رویداد ویرایش شد.");
      } else {
        await api("/api/admin/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        pushToast("رویداد اضافه شد.");
      }
      reset();
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("این رویداد حذف شود؟")) return;
    try {
      await api("/api/admin/events/" + id, { method: "DELETE" });
      pushToast("رویداد حذف شد.");
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    }
  };

  return (
    <div className="admin-calendar">
      <div className="card admin-card">
        <h3 className="gallery-title">
          {editing ? <Pencil size={17} /> : <Plus size={17} />}
          {editing ? "ویرایش رویداد" : "رویداد تازه"}
        </h3>
        <div className="admin-form">
          <label className="mission-field">
            <span>عنوان</span>
            <input
              type="text"
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div className="admin-form-row">
            <label className="mission-field">
              <span>نوع رویداد</span>
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                {EVENT_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mission-field">
              <span>تاریخ و ساعت (میلادی ورودی، نمایش شمسی)</span>
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </label>
          </div>
          <label className="mission-field">
            <span>توضیح</span>
            <textarea
              rows={3}
              maxLength={1000}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </label>
          {when ? (
            <div className="admin-hint">نمایش برای اولیا: {fmtDeadline(localToIso(when))}</div>
          ) : null}
          <div className="admin-row-actions">
            <button type="button" className="btn" onClick={save} disabled={busy}>
              {busy ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              {editing ? "ذخیرهٔ تغییر" : "افزودن به تقویم"}
            </button>
            {editing ? (
              <button type="button" className="btn secondary" onClick={reset}>
                انصراف
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {rows === null ? (
        <div className="calm-loading">
          <Loader2 size={18} className="spin" /> در حال خواندن…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="تقویم خالی است"
          hint="اولین جلسه یا امتحان را با فرم بالا ثبت کن."
          icon={<CalendarDays size={26} />}
        />
      ) : (
        <ul className="event-list admin-events">
          {rows.map((e) => (
            <li key={e.id} className="event-item">
              <span className={"event-kind " + e.kind}>
                {EVENT_KINDS.find((k) => k.id === e.kind)?.label || "رویداد"}
              </span>
              <b>{e.title}</b>
              {e.description ? <p>{e.description}</p> : null}
              <span className="event-date">{fmtDeadline(e.startsAt)}</span>
              <div className="admin-row-actions">
                <button
                  type="button"
                  className="iconbtn"
                  aria-label="ویرایش"
                  onClick={() => {
                    setEditing(e.id);
                    setTitle(e.title);
                    setDesc(e.description);
                    setKind(e.kind);
                    setWhen(isoToLocal(e.startsAt));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className="iconbtn danger"
                  aria-label="حذف"
                  onClick={() => remove(e.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- صندوق پیام‌ها ---------------- */

export function Inbox({ pushToast }: { pushToast: Toast }) {
  const [rows, setRows] = useState<InboxRow[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api("/api/messages");
      setRows(d.items || []);
    } catch (e) {
      pushToast((e as Error).message);
      setRows([]);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const reply = async (id: string) => {
    const text = (drafts[id] || "").trim();
    if (text.length < 3) return pushToast("متن پاسخ را بنویس.");
    setBusy(id);
    try {
      await api("/api/admin/messages/" + id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: text }),
      });
      pushToast("پاسخ برای والد ثبت شد.");
      setDrafts((d) => ({ ...d, [id]: "" }));
      await load();
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (rows === null)
    return (
      <div className="calm-loading">
        <Loader2 size={18} className="spin" /> در حال خواندن…
      </div>
    );

  if (!rows.length)
    return (
      <EmptyState
        title="صندوق خالی است"
        hint="پیام‌های اولیا همین‌جا می‌رسند و می‌توانی پاسخ بدهی."
        icon={<MessageCircle size={26} />}
      />
    );

  return (
    <div className="msg-list">
      {rows.map((m) => (
        <article key={m.id} className="msg-card card">
          <header className="msg-head">
            <b>{m.subject}</b>
            <span
              className={
                "mission-chip " +
                (m.status === "answered" ? "approved" : "pending")
              }
            >
              {m.status === "answered" ? <Check size={13} /> : null}
              {m.status === "answered" ? "پاسخ داده شده" : "ارسال‌شده"}
            </span>
          </header>
          <div className="msg-from">
            از {m.parentName} · <small>@{m.parentUsername}</small>
          </div>
          <p className="msg-body">{m.body}</p>
          <div className="msg-date">{fmtDeadline(m.createdAt)}</div>

          {m.reply ? (
            <div className="msg-reply">
              <b>پاسخ ثبت‌شده</b>
              <p>{m.reply}</p>
            </div>
          ) : null}

          <label className="mission-field">
            <span>پاسخ به والد</span>
            <textarea
              rows={3}
              maxLength={1500}
              value={drafts[m.id] ?? ""}
              placeholder="کوتاه و محترمانه پاسخ بده…"
              onChange={(e) =>
                setDrafts((d) => ({ ...d, [m.id]: e.target.value }))
              }
            />
          </label>
          <button
            type="button"
            className="btn mission-send"
            disabled={busy === m.id}
            onClick={() => reply(m.id)}
          >
            {busy === m.id ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Send size={16} />
            )}
            ثبت پاسخ
          </button>
        </article>
      ))}
    </div>
  );
}

/* ---------------- اتصال اولیا ---------------- */

function Families({ pushToast }: { pushToast: Toast }) {
  const [parents, setParents] = useState<{ username: string; name: string }[]>([]);
  const [students, setStudents] = useState<
    { username: string; name: string; parentUsername: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api("/api/admin/families");
      setParents(d.parents || []);
      setStudents(d.students || []);
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const setLink = async (studentUsername: string, parentUsername: string) => {
    setSaving(studentUsername);
    try {
      await api("/api/admin/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentUsername, parentUsername }),
      });
      setStudents((list) =>
        list.map((s) =>
          s.username === studentUsername ? { ...s, parentUsername } : s
        )
      );
      pushToast(
        parentUsername ? "فرزند به والد وصل شد." : "اتصال والد قطع شد."
      );
    } catch (e) {
      pushToast((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  if (loading)
    return (
      <div className="calm-loading">
        <Loader2 size={18} className="spin" /> در حال خواندن…
      </div>
    );

  return (
    <div className="families-wrap">
      <div className="card admin-card">
        <h3 className="gallery-title">
          <Users size={17} /> هر دانش‌آموز به کدام والد وصل است؟
        </h3>
        <p className="note">
          والد فقط فرزندان وصل‌شده به حساب خودش را می‌بیند. اگر والد ندارید،
          اول از صفحهٔ ثبت‌نام یک حساب والد بسازید.
        </p>
        {parents.length === 0 ? (
          <div className="admin-hint">
            هنوز هیچ حساب والدی در سیستم نیست.
          </div>
        ) : null}
        <ul className="families-list">
          {students.map((s) => (
            <li key={s.username}>
              <span className="families-name">
                {s.name} <small>@{s.username}</small>
              </span>
              <select
                value={s.parentUsername}
                disabled={saving === s.username}
                onChange={(e) => setLink(s.username, e.target.value)}
                aria-label={`والد ${s.name}`}
              >
                <option value="">— بدون والد —</option>
                {parents.map((p) => (
                  <option key={p.username} value={p.username}>
                    {p.name} (@{p.username})
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
