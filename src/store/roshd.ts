"use client";

/**
 * استور مرکزی «مسیر رشد» — احراز هویت، پیشرفت، تنظیمات و ناوبری
 */

import { create } from "zustand";
import {
  AppSettings,
  DEFAULT_SETTINGS,
  FontScale,
} from "@/lib/themes";
import {
  CERT_THRESHOLD,
  FIELDS,
  BADGE_INFO,
  seeded,
} from "@/lib/missions-data";
import { dayKey } from "@/lib/jalali";

/* ---------- انواع داده ---------- */

/** وضعیت ارسال یک ماموریت (از سرور می‌آید) */
export type MissionStatus = "pending" | "approved" | "revision";
export type MissionKind = "practical" | "reading";

export interface MissionSubmission {
  id: string;
  missionKey: string;
  field: string;
  level: string;
  day: string;
  idx: number;
  kind: MissionKind;
  title: string;
  text: string;
  link: string;
  fileName: string;
  fileType: string;
  hasFile: boolean;
  status: MissionStatus;
  teacherNote: string;
  reviewedAt: string | null;
  updatedAt: string;
}

export const MISSION_STATUS_TEXT: Record<MissionStatus | "none", string> = {
  none: "ارسال نشده",
  pending: "در انتظار بررسی",
  approved: "تایید شده",
  revision: "نیاز به اصلاح",
};

export interface UserProgress {
  name: string;
  avatar: string;
  field: string | null;
  level: string | null;
  completed: Record<string, boolean>;
  used: Record<string, number[]>;
  daily: Record<string, number[]>;
  badges: string[];
}

export interface AppData {
  users: Record<string, UserProgress>;
  currentUser: string | null;
}

export type Screen =
  | "landing"
  | "auth"
  | "field"
  | "level"
  | "dashboard"
  | "cert"
  | "videos"
  | "tasks"
  | "submissions"
  | "settings"
  | "ranking"
  | "parent";

export interface ServerUser {
  username: string;
  name: string;
  email?: string;
  role: "admin" | "student" | "parent";
  /** آدرس عکس پروفایل (خالی = بدون عکس) */
  avatar?: string;
}

interface ToastMsg {
  id: number;
  text: string;
}

const EMPTY_USER = (name: string): UserProgress => ({
  name,
  avatar: "",
  field: null,
  level: null,
  completed: {},
  used: {},
  daily: {},
  badges: [],
});

function loadAppData(): AppData {
  if (typeof window === "undefined")
    return { users: {}, currentUser: null };
  try {
    const d = JSON.parse(localStorage.getItem("growthAppData") || "null") || {
      users: {},
      currentUser: null,
    };
    return d;
  } catch {
    return { users: {}, currentUser: null };
  }
}

function saveAppData(d: AppData) {
  try {
    localStorage.setItem("growthAppData", JSON.stringify(d));
  } catch {}
}

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const s = JSON.parse(
      localStorage.getItem("roshd-settings") || "null"
    );
    if (s && typeof s.theme === "string") return { ...DEFAULT_SETTINGS, ...s };
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: AppSettings) {
  try {
    localStorage.setItem("roshd-settings", JSON.stringify(s));
  } catch {}
}

/* ---------- API ---------- */

export async function api(path: string, opts: RequestInit = {}): Promise<any> {
  const r = await fetch(path, { credentials: "include", ...opts });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "خطا");
  return data;
}

/* ---------- استور ---------- */

interface RoshdState {
  hydrated: boolean;
  serverUser: ServerUser | null;
  appData: AppData;
  settings: AppSettings;
  screen: Screen;
  authTab: "login" | "register";
  dashboardTab: string;
  pendingSection: Screen | null;
  toasts: ToastMsg[];
  drawerOpen: boolean;
  avatarModalOpen: boolean;
  /** آیا پرسش‌نامهٔ اولین ورود قبلاً تمام شده؟ (فلگ مرورگر)
      در hydrate خوانده می‌شود تا setState داخل effect لازم نشود */
  onboardingDone: boolean;

  hydrate: () => void;
  completeOnboarding: () => void;
  setScreen: (s: Screen) => void;
  /** یک پله بالاتر رفتن (دکمهٔ بازگشت هدر) */
  goBack: () => void;
  setAuthTab: (t: "login" | "register") => void;
  setDashboardTab: (t: string) => void;
  setDrawerOpen: (open: boolean) => void;
  setAvatarModalOpen: (open: boolean) => void;
  pushToast: (text: string) => void;
  dismissToast: (id: number) => void;

  setTheme: (theme: string) => void;
  setFontScale: (scale: FontScale) => void;
  setReducedMotion: (v: boolean) => void;
  setSound: (v: boolean) => void;
  resetSettings: () => void;

  bindServerUser: (u: ServerUser | null) => void;
  /** ذخیرهٔ ایمیل بازیابی روی سرور */
  saveEmail: (email: string) => Promise<{ ok?: boolean; email?: string }>;
  logout: () => void;

  curUser: () => UserProgress | null;
  selectField: (field: string) => void;
  selectLevel: (level: string) => void;
  /** آپلود عکس پروفایل روی سرور و به‌روزرسانی آواتار */
  uploadAvatar: (file: File) => Promise<void>;
  /** حذف عکس پروفایل و برگشت به حروف اول نام */
  removeAvatar: () => Promise<void>;
  /** هم‌گام‌سازی آدرس عکس با استور (بعد از آپلود/حذف) */
  applyAvatar: (url: string) => Promise<void>;
  /** خواندن پیشرفت ذخیره‌شده روی سرور (فقط ماموریت‌های تاییدشده) */
  loadServerProgress: () => Promise<void>;
  missionsForToday: () => number[];

  /** ارسال‌های ماموریت‌ها (کلید = missionKey) */
  missions: Record<string, MissionSubmission>;
  missionsLoaded: boolean;
  /** کلید ماموریتی که پنجرهٔ کارش باز است */
  missionModalKey: string | null;
  missionBusy: boolean;
  loadMissions: () => Promise<void>;
  openMission: (key: string | null) => void;
  submitMission: (input: {
    key: string;
    field: string;
    level: string;
    day: string;
    idx: number;
    kind: MissionKind;
    text: string;
    link: string;
    file: File | null;
  }) => Promise<void>;

  enterApp: () => void;
  openMenuTarget: (target: Screen) => void;
}

let toastId = 0;

export const useRoshd = create<RoshdState>((set, get) => ({
  hydrated: false,
  serverUser: null,
  appData: { users: {}, currentUser: null },
  settings: DEFAULT_SETTINGS,
  screen: "landing",
  authTab: "login",
  dashboardTab: "missionsTab",
  pendingSection: null,
  toasts: [],
  drawerOpen: false,
  avatarModalOpen: false,
  onboardingDone: false,
  missions: {},
  missionsLoaded: false,
  missionModalKey: null,
  missionBusy: false,

  hydrate: () => {
    const appData = loadAppData();
    const settings = loadSettings();
    let onboardingDone = false;
    try {
      onboardingDone = !!localStorage.getItem("roshd-onboarded");
    } catch {}
    set({ hydrated: true, appData, settings, onboardingDone });
  },

  completeOnboarding: () => {
    try {
      localStorage.setItem("roshd-onboarded", "1");
    } catch {}
    set({ onboardingDone: true });
  },

  setScreen: (s) => set({ screen: s }),

  /* بازگشت همیشه «یک پله بالاتر» است، نه «صفحهٔ قبلی»؛ بنابراین کاربر
     هیچ‌وقت یک‌راست به صفحهٔ اول سایت پرت نمی‌شود. */
  goBack: () => {
    const { screen, serverUser, appData } = get();
    const role = serverUser?.role;
    const home: Screen =
      role === "parent" ? "parent" : role === "admin" ? "submissions" : "dashboard";
    const me = appData.currentUser ? appData.users[appData.currentUser] : null;
    /* دانش‌آموزی که رشته و سطحش را قبلاً انتخاب کرده، در حال «ویرایش» است؛
       بازگشتش باید به داشبورد باشد نه به ابتدای سایت */
    const alreadySet = !!(me && me.field && me.level);
    if (screen === home) return;
    if (screen === "auth") return set({ screen: "landing" });
    if (screen === "level") return set({ screen: alreadySet ? home : "field" });
    if (screen === "field") return set({ screen: alreadySet ? home : "landing" });
    set({ screen: home });
  },
  setAuthTab: (t) => set({ authTab: t }),
  setDashboardTab: (t) => set({ dashboardTab: t }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  setAvatarModalOpen: (open) => set({ avatarModalOpen: open }),

  pushToast: (text) => {
    const id = ++toastId;
    set((st) => ({ toasts: [...st.toasts, { id, text }] }));
    // حذف و انیمیشن ورود/خروج توسط ToastItem مدیریت می‌شود
    // (قبلاً حذف ناگهانی اینجا انجام می‌شد و خروج اعلان نرم نبود)
  },
  dismissToast: (id) =>
    set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),

  setTheme: (theme) => {
    const settings = { ...get().settings, theme };
    saveSettings(settings);
    set({ settings });
  },
  setFontScale: (fontScale) => {
    const settings = { ...get().settings, fontScale };
    saveSettings(settings);
    set({ settings });
  },
  setReducedMotion: (reducedMotion) => {
    const settings = { ...get().settings, reducedMotion };
    saveSettings(settings);
    set({ settings });
  },
  setSound: (sound) => {
    const settings = { ...get().settings, sound };
    saveSettings(settings);
    set({ settings });
  },
  resetSettings: () => {
    saveSettings(DEFAULT_SETTINGS);
    set({ settings: DEFAULT_SETTINGS });
  },

  bindServerUser: (u) => {
    if (!u) {
      set((st) => ({
        serverUser: null,
        appData: { ...st.appData, currentUser: null },
      }));
      saveAppData(get().appData);
      return;
    }
    const d = { ...get().appData };
    if (!d.users[u.username]) {
      d.users[u.username] = EMPTY_USER(u.name);
    }
    d.users[u.username].name = u.name;
    // آواتار سرور مرجع است (عکس آپلودشده)؛ دادهٔ قدیمی ایموجی نادیده می‌شود
    d.users[u.username].avatar = u.avatar || "";
    d.currentUser = u.username;
    saveAppData(d);
    set({ serverUser: u, appData: d });
    // یک‌بار sync اولیهٔ پیشرفت دانش‌آموز (اگر داده‌ای دارد)
    if (u.role === "student") pushProgress();
  },

  /** ذخیرهٔ ایمیل بازیابی روی سرور و به‌روزرسانی استور */
  saveEmail: async (email: string) => {
    const d = (await api("/api/auth/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })) as { ok?: boolean; email?: string };
    const su = get().serverUser;
    if (su && d.email)
      set({ serverUser: { ...su, email: d.email } });
    return d;
  },

  logout: () => {
    api("/api/auth/logout", { method: "POST" }).catch(() => {});
    get().bindServerUser(null);
    set({ screen: "landing" });
  },

  curUser: () => {
    const { appData } = get();
    return appData.currentUser ? appData.users[appData.currentUser] || null : null;
  },

  selectField: (field) => {
    const u = get().curUser();
    if (!u) return;
    u.field = field;
    saveAppData(get().appData);
    set({ appData: { ...get().appData }, screen: "level" });
    pushProgress();
  },

  selectLevel: (level) => {
    const u = get().curUser();
    if (!u) return;
    u.level = level;
    saveAppData(get().appData);
    set({ appData: { ...get().appData }, screen: "dashboard" });
    pushProgress();
  },

  uploadAvatar: async (file) => {
    const fd = new FormData();
    fd.append("avatar", file);
    const d = (await api("/api/avatar", { method: "POST", body: fd })) as {
      avatar?: string;
    };
    await get().applyAvatar(d.avatar || "");
  },

  removeAvatar: async () => {
    await api("/api/avatar", { method: "DELETE" });
    await get().applyAvatar("");
  },

  /* سرور منبع اصلی داده است: پیشرفت ذخیره‌شده در SQLite هنگام ورود خوانده
     و با دادهٔ محلی ادغام می‌شود (اجتماع تیک‌ها و نشان‌ها). بنابراین پاک شدن
     کش مرورگر یا عوض شدن سیستم چیزی را از بین نمی‌برد. */
  loadServerProgress: async () => {
    const su = get().serverUser;
    if (!su || su.role !== "student") return;
    try {
      const d = await api("/api/progress");
      const p = d?.progress;
      if (!p) return;
      const appData = { ...get().appData, users: { ...get().appData.users } };
      const u = appData.users[su.username];
      if (!u) return;
      /* سرور مرجع است: فقط ماموریت‌های تاییدشده در آمار می‌مانند */
      const completed: Record<string, boolean> = { ...(p.completed || {}) };
      const badges = Array.from(
        new Set([...(p.badges || []), ...(u.badges || [])])
      );
      appData.users[su.username] = {
        ...u,
        field: p.field || u.field,
        level: p.level || u.level,
        completed,
        badges,
      };
      saveAppData(appData);
      set({ appData });
      pushProgress();
      // نشان‌های تازه بر اساس ماموریت‌های تاییدشده
      if (u) {
        checkBadges(u, get().pushToast);
        saveAppData(get().appData);
        set({ appData: { ...get().appData } });
      }
    } catch {
      // شبکه/دسترسی: دادهٔ محلی دست‌نخورده می‌ماند
    }
  },

  applyAvatar: async (url) => {
    const su = get().serverUser;
    if (su) set({ serverUser: { ...su, avatar: url } });
    const u = get().curUser();
    if (u) {
      u.avatar = url;
      saveAppData(get().appData);
      set({ appData: { ...get().appData } });
    }
  },

  missionsForToday: () => {
    const { appData } = get();
    const u = appData.currentUser ? appData.users[appData.currentUser] : null;
    if (!u || !u.field) return [];
    const k = u.field + "_" + u.level;
    const pool = FIELDS[u.field].missions;
    const dk = dayKey();
    const dailyKey = k + "_" + dk;
    if (u.daily[dailyKey]) return u.daily[dailyKey];
    let used = u.used[k] || [];
    let available = pool.map((_, i) => i).filter((i) => !used.includes(i));
    if (available.length < 4) {
      u.used[k] = [];
      used = [];
      available = pool.map((_, i) => i);
    }
    let seed = seeded(k + dk);
    const arr = [...available];
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const j = seed % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const chosen = arr.slice(0, 4);
    u.used[k] = [...(u.used[k] || []), ...chosen];
    u.daily[dailyKey] = chosen;
    saveAppData(appData);
    return chosen;
  },

  /* ---------- ماموریت‌ها: ارسال، بررسی معلم، جشن ---------- */

  loadMissions: async () => {
    if (get().serverUser?.role !== "student") return;
    try {
      const d = await api("/api/missions");
      const list: MissionSubmission[] = d.submissions || [];
      const map: Record<string, MissionSubmission> = {};
      for (const m of list) map[m.missionKey] = m;

      /* ماموریت‌هایی که تازه تایید شده‌اند → جشن کوچک */
      let seen: string[] = [];
      try {
        seen = JSON.parse(localStorage.getItem("roshd-seen-approved") || "[]");
      } catch {}
      const approvedNow = list
        .filter((m) => m.status === "approved")
        .map((m) => m.missionKey);
      const fresh = approvedNow.filter((k) => !seen.includes(k));

      set({ missions: map, missionsLoaded: true });

      if (fresh.length) {
        const settings = get().settings;
        if (settings.sound) playDing();
        fireConfetti();
        setTimeout(
          () =>
            get().pushToast(
              fresh.length > 1
                ? `${fresh.length} ماموریتت تایید شد — آفرین!`
                : "ماموریتت تایید شد — آفرین!"
            ),
          250
        );
        try {
          localStorage.setItem(
            "roshd-seen-approved",
            JSON.stringify(Array.from(new Set([...seen, ...approvedNow])))
          );
        } catch {}
        const u = get().curUser();
        if (u) {
          checkBadges(u, get().pushToast);
          checkAllDoneToday(u, get().pushToast);
          saveAppData(get().appData);
          set({ appData: { ...get().appData } });
        }
      }
    } catch {
      set({ missionsLoaded: true });
    }
  },

  openMission: (key) => set({ missionModalKey: key }),

  submitMission: async (input) => {
    set({ missionBusy: true });
    try {
      const fd = new FormData();
      fd.append("field", input.field);
      fd.append("level", input.level);
      fd.append("day", input.day);
      fd.append("idx", String(input.idx));
      fd.append("kind", input.kind);
      fd.append("text", input.text);
      fd.append("link", input.link);
      if (input.file) fd.append("file", input.file);

      const d = await api("/api/missions", { method: "POST", body: fd });
      const sub: MissionSubmission = d.submission;
      set((st) => ({
        missions: { ...st.missions, [sub.missionKey]: sub },
        missionBusy: false,
      }));
      get().pushToast("ارسال شد — منتظر بررسی معلم باش");
    } catch (e) {
      set({ missionBusy: false });
      get().pushToast(String((e as Error).message || "ارسال انجام نشد."));
    }
  },

  enterApp: () => {
    // والد به‌جای انتخاب رشته/سطح مستقیم به پنل مشاهده می‌رود
    if (get().serverUser?.role === "parent") {
      set({ pendingSection: null, screen: "parent" });
      return;
    }
    // مدیر وارد صفحهٔ ارسال‌ها می‌شود (به انتخاب رشته/سطح نیازی ندارد)
    if (get().serverUser?.role === "admin") {
      const pendingAdmin = get().pendingSection;
      set({ pendingSection: null, screen: pendingAdmin || "submissions" });
      return;
    }
    const u = get().curUser();
    const pending = get().pendingSection;
    set({ pendingSection: null });
    if (pending) {
      set({ screen: pending });
      return;
    }
    if (u && u.field && u.level) set({ screen: "dashboard" });
    else if (u) set({ screen: u.field ? "level" : "field" });
    else set({ screen: "auth" });
  },

  openMenuTarget: (target) => {
    set({ drawerOpen: false });
    const { serverUser, appData } = get();
    const hasAccount = !!(
      serverUser &&
      serverUser.username &&
      appData.users[serverUser.username]
    );
    if (!hasAccount) {
      set({ pendingSection: target, authTab: "login", screen: "auth" });
      return;
    }
    // هر مقصدی جز داشبورد، صفحهٔ خودش را باز می‌کند (رشته و سطح هم شامل)
    if (target !== "dashboard") {
      get().setScreen(target);
      return;
    }
    get().enterApp();
  },
}));

/* ---------- sync پیشرفت روی سرور (فقط دانش‌آموز) ---------- */

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPushBody = "";

/** بدنهٔ JSON وضعیت فعلی دانش‌آموز — برای مقایسه و ارسال */
function progressBody(): string | null {
  const st = useRoshd.getState();
  const u = st.serverUser;
  if (!u || u.role !== "student") return null;
  const cu = st.appData.users[u.username];
  if (!cu) return null;
  // اگر نه رشته‌ای انتخاب شده و نه هیچ پیشرفتی هست، چیزی برای sync نیست
  if (!cu.field && Object.keys(cu.completed).length === 0) return null;
  return JSON.stringify({
    field: cu.field || "",
    level: cu.level || "",
    completed: cu.completed,
    badges: cu.badges,
  });
}

function sendProgress(body: string, attempt: number) {
  fetch("/api/progress", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body,
  })
    .then((r) => {
      // فقط خطای سرور/شبکه را دوباره امتحان کن (۴xx بی‌فایده است)
      if (!r.ok && r.status >= 500 && attempt < 2)
        setTimeout(() => sendProgress(body, attempt + 1), 2000 * (attempt + 1));
    })
    .catch(() => {
      if (attempt < 2)
        setTimeout(() => sendProgress(body, attempt + 1), 2000 * (attempt + 1));
    });
}

/** ارسال debounce-شدهٔ پیشرفت (fire-and-forget) — آخرین حالت برنده است */
export function pushProgress() {
  if (typeof window === "undefined") return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const body = progressBody();
    if (!body || body === lastPushBody) return; // بدون تغییر — ارسال نکن
    lastPushBody = body;
    sendProgress(body, 0);
  }, 1500);
}

/* ---------- منطق نشان‌ها و آمار ---------- */

export function totalCompleted(u: UserProgress): number {
  return Object.values(u.completed).filter(Boolean).length;
}

export function computeStreak(u: UserProgress): number {
  if (!u.field) return 0;
  const k = u.field + "_" + u.level;
  let streak = 0;
  for (let x = 0; x < 60; x++) {
    const dt = new Date();
    dt.setDate(dt.getDate() - x);
    const dk = dayKey(dt);
    let count = 0;
    for (let i = 0; i < FIELDS[u.field].missions.length; i++) {
      if (u.completed[k + "_" + dk + "_" + i]) count++;
    }
    if (count >= 4) streak++;
    else break;
  }
  return streak;
}

function checkBadges(u: UserProgress, pushToast: (t: string) => void) {
  const total = totalCompleted(u);
  const streak = computeStreak(u);
  const newly: string[] = [];
  if (total >= 1 && !u.badges.includes("start")) newly.push("start");
  if (streak >= 3 && !u.badges.includes("streak3")) newly.push("streak3");
  if (streak >= 7 && !u.badges.includes("streak7")) newly.push("streak7");
  if (total >= CERT_THRESHOLD && !u.badges.includes("c25")) newly.push("c25");
  if (total >= 50 && !u.badges.includes("c50")) newly.push("c50");
  if (newly.length) {
    u.badges.push(...newly);
    newly.forEach((id, i) =>
      setTimeout(
        () =>
          pushToast(
            "نشان جدید: " + BADGE_INFO[id].title + " " + BADGE_INFO[id].icon
          ),
        i * 900
      )
    );
    setTimeout(() => fireConfetti(), 300);
  }
}

function checkAllDoneToday(u: UserProgress, pushToast: (t: string) => void) {
  if (!u.field) return;
  const k = u.field + "_" + u.level;
  const dk = dayKey();
  const pool = FIELDS[u.field].missions;
  let doneToday = 0;
  for (let i = 0; i < pool.length; i++) {
    if (u.completed[k + "_" + dk + "_" + i]) doneToday++;
  }
  if (doneToday >= 4) {
    fireConfetti();
    setTimeout(() => pushToast("همه ماموریت‌های امروز تمام شد! عالی بود"), 300);
  }
}

/* ---------- صدا ---------- */

export function playDing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  } catch {}
}

/* ---------- کانفتی (رنگ‌ها از تم فعال خوانده می‌شود) ---------- */

export function fireConfetti() {
  const canvas = document.getElementById("confetti-canvas") as HTMLCanvasElement;
  if (!canvas) return;
  const styles = getComputedStyle(document.documentElement);
  const colors = [
    styles.getPropertyValue("--accent").trim() || "#67e89a",
    styles.getPropertyValue("--accent2").trim() || "#2fc875",
    styles.getPropertyValue("--gold").trim() || "#ffd166",
    styles.getPropertyValue("--danger").trim() || "#ff7777",
    styles.getPropertyValue("--text").trim() || "#ffffff",
  ].filter((c) => c && c.length >= 4);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const parts = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.3,
    r: 4 + Math.random() * 5,
    c: colors[Math.floor(Math.random() * colors.length)],
    vy: 2 + Math.random() * 3,
    vx: -2 + Math.random() * 4,
    rot: Math.random() * 360,
    vr: -6 + Math.random() * 12,
  }));
  const reduced = document.documentElement.dataset.motion === "reduced";
  if (reduced) {
    // بدون انیمیشن: یک فریم ثابت نمایش بده
    parts.forEach((p) => {
      p.y += 100;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
      ctx.restore();
    });
    setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 600);
    return;
  }
  let frame = 0;
  let raf = 0;
  const step = () => {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
      ctx.restore();
    });
    if (frame < 130) raf = requestAnimationFrame(step);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  step();
}
