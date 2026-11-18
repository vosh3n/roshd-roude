"use client";

import { useEffect, useState } from "react";
import { useRoshd, api, fireConfetti } from "@/store/roshd";
import { getTheme } from "@/lib/themes";
import LandingScreen from "./landing-screen";
import AuthScreen from "./auth-screen";
import FieldScreen from "./field-screen";
import LevelScreen from "./level-screen";
import DashboardScreen from "./dashboard-screen";
import CertScreen from "./cert-screen";
import VideosScreen from "./videos-screen";
import TasksScreen from "./tasks-screen";
import SubmissionsScreen from "./submissions-screen";
import { ArrowRight } from "lucide-react";
import SettingsScreen from "./settings-screen";
import RankingScreen from "./ranking-screen";
import UserAvatar from "./user-avatar";
import ParentScreen from "./parent-screen";
import AdminPanelScreen from "./admin-panel-screen";
import SideDrawer, { DrawerToggle } from "./side-drawer";
import { ROLE_LABEL } from "@/lib/role-labels";
import AvatarModal from "./avatar-modal";
import MissionModal from "./mission-modal";
import OnboardingQuiz from "./onboarding-quiz";
import { FIELD_THEME } from "@/lib/missions-data";

/** اعمال تم و تنظیمات روی المان html */
function ThemeApplier() {
  const settings = useRoshd((s) => s.settings);
  useEffect(() => {
    const html = document.documentElement;
    const theme = getTheme(settings.theme);
    html.setAttribute("data-theme", settings.theme);
    /* حالت روشن/تاریک پوسته — برای شیشهٔ ماتِ درست: متریال شیشه در تم‌های
       تیره باید از پس‌زمینه روشن‌تر باشد (مثل sheet های حالت تاریک iOS) */
    html.setAttribute("data-mode", theme.dark ? "dark" : "light");
    if (settings.fontScale && settings.fontScale !== "normal") {
      html.setAttribute("data-fontscale", settings.fontScale);
    } else {
      html.removeAttribute("data-fontscale");
    }
    if (settings.reducedMotion) html.setAttribute("data-motion", "reduced");
    else html.removeAttribute("data-motion");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme.dark ? "#07100c" : "#eef6f1");
    }
  }, [settings]);
  return null;
}

/** رنگ هویت رشته روی المان html — برای کارت‌ها، مسیر و ماسکات */
function FieldTheme() {
  const appData = useRoshd((s) => s.appData);
  const field = appData.currentUser
    ? appData.users[appData.currentUser]?.field || ""
    : "";
  useEffect(() => {
    const html = document.documentElement;
    const theme = FIELD_THEME[field];
    if (theme) {
      html.setAttribute("data-field", field);
      html.style.setProperty("--field-1", theme.color);
      html.style.setProperty("--field-2", theme.second);
    } else {
      html.removeAttribute("data-field");
      html.style.removeProperty("--field-1");
      html.style.removeProperty("--field-2");
    }
  }, [field]);
  return null;
}

/** بارگذاری وضعیت کاربر از سرور در شروع */
function SessionLoader() {
  const hydrate = useRoshd((s) => s.hydrate);
  const bindServerUser = useRoshd((s) => s.bindServerUser);
  const hydrated = useRoshd((s) => s.hydrated);

  useEffect(() => {
    hydrate();
    api("/api/auth/me")
      .then((d) => {
        if (!d.user) return;
        bindServerUser(d.user);
        // پیشرفت ذخیره‌شده در دیتابیس را برگردان (نه فقط localStorage)
        if (d.user.role === "student") {
          useRoshd.getState().loadServerProgress();
          useRoshd.getState().loadMissions();
        }
      })
      .catch(() => {});
  }, [hydrate, bindServerUser]);

  if (!hydrated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--muted)",
        }}
        dir="rtl"
      >
        در حال بارگذاری…
      </div>
    );
  }
  return null;
}

const SCREENS: Record<
  string,
  { id: string; Comp: React.ComponentType }
> = {
  landing: { id: "landingScreen", Comp: LandingScreen },
  auth: { id: "authScreen", Comp: AuthScreen },
  field: { id: "fieldScreen", Comp: FieldScreen },
  level: { id: "levelScreen", Comp: LevelScreen },
  dashboard: { id: "dashboardScreen", Comp: DashboardScreen },
  cert: { id: "certScreen", Comp: CertScreen },
  videos: { id: "videosScreen", Comp: VideosScreen },
  tasks: { id: "tasksScreen", Comp: TasksScreen },
  submissions: { id: "submissionsScreen", Comp: SubmissionsScreen },
  ranking: { id: "rankingScreen", Comp: RankingScreen },
  settings: { id: "settingsScreen", Comp: SettingsScreen },
  parent: { id: "parentScreen", Comp: ParentScreen },
  admin: { id: "adminScreen", Comp: AdminPanelScreen },
};

/** اعلان تکی: ورود فنری + خروج نرم — چرخهٔ عمر خودش را مدیریت می‌کند
 *  (قبلاً حذف ناگهانی از استور انجام می‌شد و انیمیشن خروج نداشتیم؛
 *  چند اعلان هم‌زمان روی هم می‌افتادند — حالا داخل .toast-stack مرتب‌اند) */
function ToastItem({ id, text }: { id: number; text: string }) {
  const dismissToast = useRoshd((s) => s.dismissToast);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true));
    const hide = setTimeout(() => setShow(false), 2600);
    const remove = setTimeout(() => dismissToast(id), 3150);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hide);
      clearTimeout(remove);
    };
  }, [id, dismissToast]);

  return (
    <div className={"toast" + (show ? " show" : "")} role="status">
      {text}
    </div>
  );
}

export default function RoshdApp() {
  const screen = useRoshd((s) => s.screen);
  const serverUser = useRoshd((s) => s.serverUser);
  const appData = useRoshd((s) => s.appData);
  const curUser = useRoshd((s) => s.curUser);
  const goBack = useRoshd((s) => s.goBack);
  const drawerOpen = useRoshd((s) => s.drawerOpen);
  const toasts = useRoshd((s) => s.toasts);

  const u = appData.currentUser ? curUser() : null;
  const inApp =
    screen !== "landing" &&
    screen !== "auth" &&
    !!(serverUser && appData.users[serverUser.username]);

  /* صفحهٔ «خانه» هر نقش — دکمهٔ بازگشت فقط وقتی معنا دارد نمایش داده
     می‌شود که کاربر در صفحهٔ خانه نباشد (یک پله بالاتر وجود داشته باشد) */
  const homeScreen =
    serverUser?.role === "parent"
      ? "parent"
      : serverUser?.role === "superadmin"
        ? "admin"
        : serverUser?.role === "admin"
          ? "submissions"
          : "dashboard";
  const canGoBack = screen !== "landing" && screen !== homeScreen;
  /* دکمهٔ بازگشت همیشه یک‌جای ثابت: گوشهٔ آغازین نوار بالا (کنار تیتر)
     با اندازهٔ ۴۴px و فاصلهٔ یکسان؛ در صفحه‌های خانه نمایش داده نمی‌شود. */

  useEffect(() => {
    const onResize = () => {
      const c = document.getElementById("confetti-canvas") as HTMLCanvasElement;
      if (c) {
        c.width = window.innerWidth;
        c.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <ThemeApplier />
      <FieldTheme />
      <SessionLoader />
      <canvas id="confetti-canvas" aria-hidden="true" />
      <OnboardingQuiz />

      {screen === "landing" ? null : (
        <header id="mainHeader">
          {canGoBack ? (
            <button
              type="button"
              className="iconbtn back-btn"
              title="بازگشت"
              aria-label="بازگشت به صفحهٔ بالاتر"
              onClick={goBack}
            >
              <ArrowRight size={19} />
            </button>
          ) : null}
          {/* دکمهٔ منو فقط وقتی نمایش داده می‌شود که کاربر وارد حساب شده
              باشد؛ وگرنه منو خالی و بی‌معنی می‌شد */}
          {inApp ? <DrawerToggle open={drawerOpen} /> : null}
          <div className="brand">
            <div className="logo">
              مسیر <span>رشد</span>
            </div>
            <div className="subtitle">
              {serverUser?.role === "admin"
                ? "پنل معلم — مدیریت تکالیف، ویدیوها و ارسال‌ها"
                : serverUser?.role === "superadmin"
                  ? "پنل مدیر سایت — گالری، اطلاعیه‌ها، تقویم و پیام‌ها"
                  : "هر روز ۴ ماموریت، متناسب با رشته و سطح تو"}
            </div>
          </div>
          {inApp && serverUser ? (
            <div className="topbar-right">
              <span className="username-chip">
                {u?.name || serverUser.name}
                {serverUser.role === "admin" ||
                serverUser.role === "superadmin" ? (
                  <small className="role-tag">
                    {ROLE_LABEL[serverUser.role]}
                  </small>
                ) : null}
              </span>
              <button
                type="button"
                className="avatar-circle"
                title="عکس پروفایل"
                aria-label="عکس پروفایل"
                onClick={() => useRoshd.getState().setAvatarModalOpen(true)}
              >
                <UserAvatar src={serverUser.avatar} name={u?.name || serverUser.name} />
              </button>
            </div>
          ) : null}
        </header>
      )}

      <SideDrawer open={drawerOpen} />

      {screen === "landing" ? (
        <LandingScreen />
      ) : (
        <div className="container">
          {Object.entries(SCREENS)
            .filter(([key]) => key !== "landing")
            .map(([key, { id, Comp }]) => (
              <section
                key={key}
                id={id}
                className={"screen" + (screen === key ? " active" : "")}
                aria-hidden={screen !== key}
              >
                {screen === key ? <Comp /> : null}
              </section>
            ))}
        </div>
      )}

      <AvatarModal />
      <MissionModal />

      {/* اعلان‌ها — پشتهٔ مرتب با انیمیشن ورود/خروج */}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <ToastItem key={t.id} id={t.id} text={t.text} />
        ))}
      </div>
    </>
  );
}
