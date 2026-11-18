"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2, X } from "lucide-react";
import { useRoshd } from "@/store/roshd";
import UserAvatar from "./user-avatar";

/** پنجرهٔ عکس پروفایل — آپلود/تغییر/حذف عکس (به‌جای ایموجی) */
export default function AvatarModal() {
  const open = useRoshd((s) => s.avatarModalOpen);
  const setOpen = useRoshd((s) => s.setAvatarModalOpen);
  const uploadAvatar = useRoshd((s) => s.uploadAvatar);
  const removeAvatar = useRoshd((s) => s.removeAvatar);
  const pushToast = useRoshd((s) => s.pushToast);
  const serverUser = useRoshd((s) => s.serverUser);
  const curUser = useRoshd((s) => s.curUser);

  const fileRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const u = curUser();
  const name = u?.name || serverUser?.name || "";
  const src = serverUser?.avatar || "";

  /* دسترس‌پذیری: فوکوس هنگام باز شدن به دیالوگ می‌آید (نه body) */
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => modalRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      await uploadAvatar(file);
      pushToast("عکس پروفایل به‌روز شد.");
      setOpen(false);
    } catch (e) {
      pushToast(String((e as Error).message || "آپلود عکس انجام نشد."));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await removeAvatar();
      pushToast("عکس پروفایل حذف شد");
      setOpen(false);
    } catch (e) {
      pushToast(String((e as Error).message || "حذف عکس انجام نشد."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-bg"
      id="avatarModal"
      role="dialog"
      aria-modal="true"
      aria-label="عکس پروفایل"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="modal avatar-modal" ref={modalRef} tabIndex={-1}>
        <button
          type="button"
          className="modal-close"
          aria-label="بستن"
          onClick={() => setOpen(false)}
        >
          <X size={18} />
        </button>

        <h2 className="section-title">عکس پروفایل</h2>
        <p className="avatar-hint">
          یک عکس واضح از خودت انتخاب کن؛ جای نام و عکس‌های آماده، عکس واقعی
          خودت نمایش داده می‌شود.
        </p>

        <div className="avatar-preview">
          <UserAvatar src={src} name={name} className="avatar-lg" />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(e) => pick(e.target.files?.[0])}
        />

        <div className="avatar-actions">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? <Loader2 size={16} className="spin" /> : <Camera size={16} />}
            {src ? "تغییر عکس" : "انتخاب عکس"}
          </button>
          {src ? (
            <button
              type="button"
              className="btn secondary"
              disabled={busy}
              onClick={remove}
            >
              <Trash2 size={16} />
              حذف عکس
            </button>
          ) : null}
        </div>

        <p className="avatar-limit">
          JPG، PNG، WebP یا GIF — حداکثر ۳ مگابایت
        </p>
      </div>
    </div>
  );
}
