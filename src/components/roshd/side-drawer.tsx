"use client";

import { useEffect } from "react";
import {
  ClipboardCheck,
  ClipboardList,
  Compass,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PlayCircle,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRoshd, Screen } from "@/store/roshd";
import { Role, ROLE_LABEL } from "@/lib/role-labels";
import UserAvatar from "./user-avatar";

/**
 * گزینه‌های منوی کناری — هر گزینه دقیقاً یک صفحهٔ مستقل است و برای هر نقش
 * فقط یک‌بار نمایش داده می‌شود. صفحهٔ خانهٔ هر نقش (داشبورد دانش‌آموز،
 * ارسال‌ها برای معلم، پنل اولیا برای والد) در منو تکرار نمی‌شود.
 */
const NAV: {
  target: Screen;
  label: string;
  Icon: LucideIcon;
  roles: Role[];
}[] = [
  {
    target: "dashboard",
    label: "داشبورد",
    Icon: LayoutDashboard,
    roles: ["student"],
  },
  {
    target: "tasks",
    label: "تکالیف",
    Icon: ClipboardList,
    roles: ["student", "admin"],
  },
  {
    target: "videos",
    label: "ویدیوهای آموزشی",
    Icon: PlayCircle,
    roles: ["student", "admin"],
  },
  {
    target: "ranking",
    label: "رتبه‌بندی",
    Icon: Trophy,
    roles: ["student", "admin"],
  },
  { target: "field", label: "رشته و سطح", Icon: Compass, roles: ["student"] },
  {
    target: "parent",
    label: "پنل اولیا",
    Icon: Users,
    roles: ["parent"],
  },
  /* مدیر سایت فقط سه بخش دارد: پنل اولیا، پنل معلم، دانش‌آموزان */
  {
    target: "admin",
    label: "پنل اولیا",
    Icon: Users,
    roles: ["superadmin"],
  },
  {
    target: "teacher",
    label: "پنل معلم",
    Icon: ShieldCheck,
    roles: ["superadmin"],
  },
  {
    target: "students",
    label: "دانش‌آموزان",
    Icon: GraduationCap,
    roles: ["superadmin"],
  },
  {
    target: "submissions",
    label: "ارسال‌های ماموریت",
    Icon: ClipboardCheck,
    roles: ["admin"],
  },
  {
    target: "admin",
    label: "اطلاعیه‌ها و پیام‌ها",
    Icon: Megaphone,
    roles: ["admin"],
  },
  {
    target: "settings",
    label: "تنظیمات",
    Icon: Settings,
    roles: ["student", "admin", "parent", "superadmin"],
  },
];

function navForRole(role: Role | undefined) {
  if (!role) return [];
  return NAV.filter((n) => n.roles.includes(role));
}

/** دکمهٔ همبرگری — در نوار بالای صفحه (نه شناور) تا با بقیهٔ دکمه‌ها هم‌تراز باشد */
export function DrawerToggle({ open }: { open: boolean }) {
  const setDrawerOpen = useRoshd((s) => s.setDrawerOpen);
  return (
    <button
      className="side-toggle"
      id="sideToggle"
      type="button"
      aria-label={open ? "بستن منو" : "باز کردن منو"}
      aria-expanded={open}
      aria-controls="sideDrawer"
      onClick={() => setDrawerOpen(!open)}
    >
      {open ? <X size={20} /> : <Menu size={20} />}
    </button>
  );
}

export default function SideDrawer({ open }: { open: boolean }) {
  const setDrawerOpen = useRoshd((s) => s.setDrawerOpen);
  const openMenuTarget = useRoshd((s) => s.openMenuTarget);
  const serverUser = useRoshd((s) => s.serverUser);
  const logout = useRoshd((s) => s.logout);
  const screen = useRoshd((s) => s.screen);
  const unread = useRoshd((s) => s.announcementUnread);

  const close = () => setDrawerOpen(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDrawerOpen]);

  /* قفل اسکرول پس‌زمینه تا وقتی منو باز است */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* دسترس‌پذیری: فوکوس روی دکمهٔ بستن هنگام باز شدن منو */
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(
      () => document.querySelector<HTMLButtonElement>("#drawerClose")?.focus(),
      60
    );
    return () => clearTimeout(t);
  }, [open]);

  const items = navForRole(serverUser?.role);

  return (
    <>
      <div
        className={"side-backdrop" + (open ? " open" : "")}
        id="sideBackdrop"
        onClick={close}
        aria-hidden="true"
      />
      <aside
        className={"side-drawer" + (open ? " open" : "")}
        id="sideDrawer"
        role="dialog"
        aria-modal="true"
        aria-label="منوی اصلی"
        aria-hidden={!open}
      >
        <div className="drawer-top">
          {serverUser ? (
            <button
              type="button"
              className="drawer-profile"
              onClick={() => {
                close();
                openMenuTarget("settings");
              }}
            >
              <UserAvatar src={serverUser.avatar} name={serverUser.name} />
              <span>
                <b>{serverUser.name}</b>
                <small>{ROLE_LABEL[serverUser.role]}</small>
              </span>
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="drawer-close"
            id="drawerClose"
            aria-label="بستن منو"
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="drawer-nav" aria-label="بخش‌های سایت">
          {items.map(({ target, label, Icon }) => (
            <button
              key={label}
              type="button"
              className={"drawer-item" + (screen === target ? " active" : "")}
              aria-current={screen === target ? "page" : undefined}
              onClick={() => openMenuTarget(target)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
              {target === "parent" && unread > 0 ? (
                <span className="drawer-badge" aria-label={`${unread} اطلاعیهٔ خوانده‌نشده`}>
                  {unread > 9 ? "۹+" : unread.toLocaleString("fa-IR")}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        {serverUser ? (
          <div className="drawer-foot">
            <button
              type="button"
              className="drawer-item drawer-logout"
              onClick={() => {
                close();
                logout();
              }}
            >
              <LogOut size={18} aria-hidden="true" />
              <span>خروج از حساب</span>
            </button>
          </div>
        ) : null}
      </aside>
    </>
  );
}
