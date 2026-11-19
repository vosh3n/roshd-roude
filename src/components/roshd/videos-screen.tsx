"use client";

import { useCallback, useEffect, useState } from "react";
import { useRoshd, api } from "@/store/roshd";

interface VideoItem {
  id: string;
  title: string;
}

export default function VideosScreen() {
  const serverUser = useRoshd((s) => s.serverUser);
  const pushToast = useRoshd((s) => s.pushToast);
  const isAdmin =
    serverUser?.role === "admin" || serverUser?.role === "superadmin";

  const [videos, setVideos] = useState<VideoItem[] | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    api("/api/videos")
      .then((d) => setVideos(d.videos))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const uploadVideo = async () => {
    setUploadError("");
    if (!title.trim() || !file) {
      setUploadError("عنوان و فایل ویدیو لازم است.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setUploadError("حداکثر حجم فایل ۱۰۰ مگابایت است.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("file", file);
      await api("/api/videos", { method: "POST", body: fd });
      setTitle("");
      setFile(null);
      (document.getElementById("videoFile") as HTMLInputElement)!.value = "";
      load();
    } catch (e: any) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const del = async (id: string) => {
    setDeleting(id);
    try {
      await api("/api/videos/" + encodeURIComponent(id), { method: "DELETE" });
      load();
    } catch (e: any) {
      pushToast(e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <h2 className="section-title">ویدیوهای آموزشی</h2>

      {isAdmin ? (
        <div className="card" style={{ padding: "1.125rem", marginBottom: "1rem" }} id="videoAdmin">
          <div className="field-group">
            <label htmlFor="videoTitle">عنوان ویدیو</label>
            <input
              id="videoTitle"
              type="text"
              placeholder="عنوان"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label htmlFor="videoFile">فایل ویدیو</label>
            <input
              id="videoFile"
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <button className="btn" type="button" onClick={uploadVideo} disabled={uploading}>
            {uploading ? "در حال بارگذاری…" : "بارگذاری ویدیو"}
          </button>
          <div className="error-msg" id="videoError" role="alert">
            {uploadError}
          </div>
        </div>
      ) : null}

      <div id="videoList">
        {error ? <div className="empty card">{error}</div> : null}
        {!error && videos === null ? (
          <div className="empty">در حال بارگذاری…</div>
        ) : null}
        {videos && videos.length === 0 ? (
          <div className="empty card">ویدیویی بارگذاری نشده است.</div>
        ) : null}
        {videos?.map((v) => (
          <div key={v.id} className="card media-card">
            <b>{v.title}</b>
            <video
              controls
              preload="metadata"
              src={"/api/videos/" + encodeURIComponent(v.id) + "/file"}
            />
            {isAdmin ? (
              <button
                className="btn secondary"
                type="button"
                style={{ marginInlineStart: "0.5rem" }}
                onClick={() => del(v.id)}
                disabled={deleting === v.id}
              >
                {deleting === v.id ? "در حال حذف…" : "حذف ویدیو"}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}
