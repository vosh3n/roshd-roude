"use client";

/**
 * پنل معلم از نگاه مدیر سایت — دسترسی کامل به همهٔ کارهای معلم:
 * ارسال‌های تکالیف و ماموریت‌ها، ساخت تکلیف، ویدیوها، اطلاعیه‌ها و
 * صندوق پیام‌های اولیا. همهٔ دسترسی‌ها سمت سرور هم بررسی می‌شوند.
 */

import { useState } from "react";
import {
  BellRing,
  ClipboardCheck,
  ClipboardList,
  MessageCircle,
  PlayCircle,
} from "lucide-react";
import { useRoshd } from "@/store/roshd";
import SubmissionsScreen from "./submissions-screen";
import TasksScreen from "./tasks-screen";
import VideosScreen from "./videos-screen";
import { Inbox, NewsAdmin } from "./admin-panel-screen";

type Tab = "submissions" | "tasks" | "videos" | "news" | "messages";

const TABS: { id: Tab; label: string; Icon: typeof ClipboardCheck }[] = [
  { id: "submissions", label: "ارسال‌ها و ماموریت‌ها", Icon: ClipboardCheck },
  { id: "tasks", label: "تکالیف", Icon: ClipboardList },
  { id: "videos", label: "ویدیوها", Icon: PlayCircle },
  { id: "news", label: "اطلاعیه‌ها", Icon: BellRing },
  { id: "messages", label: "صندوق پیام‌ها", Icon: MessageCircle },
];

export default function TeacherPanelScreen() {
  const pushToast = useRoshd((s) => s.pushToast);
  const [tab, setTab] = useState<Tab>("submissions");

  return (
    <div className="sa-teacher" dir="rtl">
      <div className="page-head">
        <h2 className="section-title">پنل معلم</h2>
        <p className="note">
          همان چیزهایی که معلم می‌بیند — با دسترسی کامل مدیر سایت.
        </p>
      </div>

      <div
        className="parent-tabs admin-tabs"
        role="tablist"
        aria-label="بخش‌های پنل معلم"
      >
        {TABS.map(({ id, label, Icon }) => (
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

      {tab === "submissions" ? <SubmissionsScreen /> : null}
      {tab === "tasks" ? <TasksScreen /> : null}
      {tab === "videos" ? <VideosScreen /> : null}
      {tab === "news" ? <NewsAdmin pushToast={pushToast} /> : null}
      {tab === "messages" ? <Inbox pushToast={pushToast} /> : null}
    </div>
  );
}
