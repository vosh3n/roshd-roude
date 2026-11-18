/**
 * رجیستری پوسته‌های «مسیر رشد»
 * هر پوسته شامل متادیتا، رنگ‌های پیش‌نمایش و دسته‌بندی است.
 * مقادیر CSS اصلی در globals.css با html[data-theme="..."] تعریف شده‌اند.
 */

export type ThemeCategory = "default" | "design" | "github" | "retro";

export interface ThemePreviewVars {
  bg: string;
  card: string;
  card2: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  accentSoftText: string;
  btnBg: string;
  btnText: string;
  track: string;
}

export interface ThemeDef {
  id: string;
  /** نام نمایشی فارسی */
  name: string;
  /** نام لاتین */
  nameEn: string;
  category: ThemeCategory;
  dark: boolean;
  /** توضیح فارسی */
  description: string;
  /** منبع الهام (گیت‌هاب و...) */
  source: string;
  /** آیکون معرف */
  icon: string;
  /** رنگ‌های پیش‌نمایش کوچک در تنظیمات */
  preview: ThemePreviewVars;
}

export const THEME_CATEGORIES: Record<
  ThemeCategory,
  { label: string; hint: string }
> = {
  default: {
    label: "پوسته‌های مسیر رشد",
    hint: "ظاهر اصلی خود سایت، در دو حالت تاریک و روشن",
  },
  design: {
    label: "زبان‌های طراحی معروف",
    hint: "زبان طراحی گوگل (Material You) و اپل (iOS) با اصول رسمی خودشان",
  },
  github: {
    label: "پالت‌های محبوب گیت‌هاب",
    hint: "رنگ‌های رسمی معروف‌ترین پالت‌های دنیای توسعه‌دهندگان",
  },
  retro: {
    label: "نوستالژی و خاص",
    hint: "تم قدیمی ویندوز ۹۸، پیکسلی ۸-بیتی و ترمینال CRT",
  },
};

export const THEMES: ThemeDef[] = [
  {
    id: "roshd-dark",
    name: "مسیر رشد | تاریک",
    nameEn: "Roshd Dark",
    category: "default",
    dark: true,
    description: "پوسته پیش‌فرض سایت با پس‌زمینه سبز تیره و حس رشد",
    source: "پوسته اصلی مسیر رشد",
    icon: "🌿",
    preview: {
      bg: "#07100c",
      card: "#111f19",
      card2: "#111f19",
      line: "#234034",
      text: "#f5faf7",
      muted: "#9fb2a8",
      accent: "#67e89a",
      accentSoft: "#173d29",
      accentSoftText: "#b7f5d0",
      btnBg: "#163322",
      btnText: "#eafff2",
      track: "#1a2922",
    },
  },
  {
    id: "roshd-light",
    name: "مسیر رشد | روشن",
    nameEn: "Roshd Light",
    category: "default",
    dark: false,
    description: "نسخه روشن و daylight پوسته پیش‌فرض",
    source: "پوسته اصلی مسیر رشد",
    icon: "🌱",
    preview: {
      bg: "#eef6f1",
      card: "#f4f9f6",
      card2: "#f4f9f6",
      line: "#d7e7dd",
      text: "#0e1f16",
      muted: "#5c7568",
      accent: "#1f9d5c",
      accentSoft: "#d3ecdd",
      accentSoftText: "#14532d",
      btnBg: "#1f9d5c",
      btnText: "#ffffff",
      track: "#dcece2",
    },
  },
  {
    id: "material-you",
    name: "گوگل | Material You",
    nameEn: "Google Material You",
    category: "design",
    dark: false,
    description:
      "زبان طراحی گوگل با سیستم رنگ تونال، گوشه‌های نرم و دکمه‌های کپسولی",
    source: "material-foundation / Material 3",
    icon: "🎯",
    preview: {
      bg: "#f7fbf2",
      card: "#ffffff",
      card2: "#f1f8ec",
      line: "#d9e4d2",
      text: "#181d18",
      muted: "#414941",
      accent: "#006e1c",
      accentSoft: "#d5e8cf",
      accentSoftText: "#101f10",
      btnBg: "#006e1c",
      btnText: "#ffffff",
      track: "#dde5da",
    },
  },
  {
    id: "apple-ios",
    name: "اپل | iOS روشن",
    nameEn: "Apple iOS Light",
    category: "design",
    dark: false,
    description:
      "زبان طراحی اپل: کارت‌های سفید، جداکننده‌های ظریف، دکمه‌های آبی کپسولی و شیشه‌مات",
    source: "Apple Human Interface Guidelines",
    icon: "🍎",
    preview: {
      bg: "#f2f2f7",
      card: "#ffffff",
      card2: "#f7f7fa",
      line: "#e2e2e8",
      text: "#000000",
      muted: "#6d6d72",
      accent: "#007aff",
      accentSoft: "#d9ecff",
      accentSoftText: "#0040dd",
      btnBg: "#007aff",
      btnText: "#ffffff",
      track: "#e5e5ea",
    },
  },
  {
    id: "apple-dark",
    name: "اپل | iOS تاریک",
    nameEn: "Apple iOS Dark",
    category: "design",
    dark: true,
    description:
      "حالت تاریک اپل با پس‌زمینه OLED و آبی روشن سیستم",
    source: "Apple Human Interface Guidelines",
    icon: "🌑",
    preview: {
      bg: "#000000",
      card: "#1c1c1e",
      card2: "#2c2c2e",
      line: "#2c2c2e",
      text: "#ffffff",
      muted: "#98989f",
      accent: "#0a84ff",
      accentSoft: "#10263f",
      accentSoftText: "#7dcdff",
      btnBg: "#0a84ff",
      btnText: "#ffffff",
      track: "#2c2c2e",
    },
  },
  {
    id: "dracula",
    name: "دراکولا",
    nameEn: "Dracula",
    category: "github",
    dark: true,
    description: "پالت ارغوانی معروف دراکولا با رنگ‌های زنده بنفش و صورتی",
    source: "github.com/dracula/dracula-theme",
    icon: "🧛",
    preview: {
      bg: "#282a36",
      card: "#343746",
      card2: "#3a3d52",
      line: "#44475a",
      text: "#f8f8f2",
      muted: "#7e88b8",
      accent: "#bd93f9",
      accentSoft: "#44355f",
      accentSoftText: "#d6c2ff",
      btnBg: "#bd93f9",
      btnText: "#21222c",
      track: "#21222c",
    },
  },
  {
    id: "nord",
    name: "نورد",
    nameEn: "Nord",
    category: "github",
    dark: true,
    description: "پالت قطبی و آرام نورد با آبی‌های سرد",
    source: "github.com/nordtheme/nord",
    icon: "❄️",
    preview: {
      bg: "#2e3440",
      card: "#3b4252",
      card2: "#434c5e",
      line: "#434c5e",
      text: "#eceff4",
      muted: "#aeb6c9",
      accent: "#88c0d0",
      accentSoft: "#3f4c5d",
      accentSoftText: "#cfe6ee",
      btnBg: "#88c0d0",
      btnText: "#2e3440",
      track: "#2e3440",
    },
  },
  {
    id: "catppuccin",
    name: "کت‌پوچین",
    nameEn: "Catppuccin Macchiato",
    category: "github",
    dark: true,
    description: "پاستل‌های نرم و لطیف کت‌پوچین برای چشمی راحت",
    source: "github.com/catppuccin/catppuccin",
    icon: "🐱",
    preview: {
      bg: "#24273a",
      card: "#363a4f",
      card2: "#494d64",
      line: "#494d64",
      text: "#cad3f5",
      muted: "#a5adcb",
      accent: "#c6a0f6",
      accentSoft: "#3e3a55",
      accentSoftText: "#e3d2ff",
      btnBg: "#c6a0f6",
      btnText: "#24273a",
      track: "#1e2030",
    },
  },
  {
    id: "gruvbox",
    name: "گروباکس",
    nameEn: "Gruvbox",
    category: "github",
    dark: true,
    description: "رنگ‌های رترو و گرم گروباکس با زرد خردلی و سبز زیتونی",
    source: "github.com/morhetz/gruvbox",
    icon: "🟤",
    preview: {
      bg: "#282828",
      card: "#32302f",
      card2: "#3c3836",
      line: "#504945",
      text: "#ebdbb2",
      muted: "#a89984",
      accent: "#fabd2f",
      accentSoft: "#4a4228",
      accentSoftText: "#ffe08a",
      btnBg: "#fabd2f",
      btnText: "#282828",
      track: "#1d2021",
    },
  },
  {
    id: "tokyo-night",
    name: "توکیو نایت",
    nameEn: "Tokyo Night",
    category: "github",
    dark: true,
    description: "الهام از شب‌های توکیو با آبی شهری و بنفش نئونی",
    source: "github.com/enkia/tokyo-night-vscode-theme",
    icon: "🌃",
    preview: {
      bg: "#16161e",
      card: "#1a1b26",
      card2: "#24283b",
      line: "#292e42",
      text: "#c0caf5",
      muted: "#7982a9",
      accent: "#7aa2f7",
      accentSoft: "#273355",
      accentSoftText: "#b4ccff",
      btnBg: "#7aa2f7",
      btnText: "#16161e",
      track: "#13131a",
    },
  },
  {
    id: "solarized",
    name: "سولاریزد دارک",
    nameEn: "Solarized Dark",
    category: "github",
    dark: true,
    description: "پالت کلاسیک و دقیق سولاریزد با فیروزه‌ای شاخص",
    source: "github.com/altercation/solarized",
    icon: "🌞",
    preview: {
      bg: "#002b36",
      card: "#073642",
      card2: "#0b4250",
      line: "#144b57",
      text: "#93a1a1",
      muted: "#6d8a93",
      accent: "#2aa198",
      accentSoft: "#0d4d4a",
      accentSoftText: "#9fe8e2",
      btnBg: "#2aa198",
      btnText: "#002b36",
      track: "#00222b",
    },
  },
  {
    id: "rose-pine",
    name: "روزِ پایین",
    nameEn: "Rosé Pine",
    category: "github",
    dark: true,
    description: "پالت طبیعی، خاموش و شیک با بنفش و گل سرخ",
    source: "github.com/rose-pine/palette",
    icon: "🌹",
    preview: {
      bg: "#191724",
      card: "#1f1d2e",
      card2: "#26233a",
      line: "#302d4b",
      text: "#e0def4",
      muted: "#908caa",
      accent: "#c4a7e7",
      accentSoft: "#32294b",
      accentSoftText: "#ded3f7",
      btnBg: "#c4a7e7",
      btnText: "#191724",
      track: "#14121f",
    },
  },
  {
    id: "everforest",
    name: "اورفورست",
    nameEn: "Everforest",
    category: "github",
    dark: true,
    description: "جنگل همیشه‌سبز؛ پالت آرام با رنگ‌های خاکی و طبیعی",
    source: "github.com/sainnhe/everforest",
    icon: "🌲",
    preview: {
      bg: "#2d353b",
      card: "#343f44",
      card2: "#3d484d",
      line: "#475258",
      text: "#d3c6aa",
      muted: "#9da9a0",
      accent: "#83c092",
      accentSoft: "#35494a",
      accentSoftText: "#c3e8d1",
      btnBg: "#83c092",
      btnText: "#2d353b",
      track: "#272e33",
    },
  },
  {
    id: "synthwave",
    name: "سینث‌ویو ۸۴",
    nameEn: "Synthwave '84",
    category: "github",
    dark: true,
    description: "نئون دهه ۸۰ با صورتی و فیروزه‌ای درخشان",
    source: "github.com/robb0wen/synthwave-vscode",
    icon: "🕶️",
    preview: {
      bg: "#262335",
      card: "#2a2139",
      card2: "#34294f",
      line: "#463465",
      text: "#ffffff",
      muted: "#a89ec9",
      accent: "#ff7edb",
      accentSoft: "#41285a",
      accentSoftText: "#ffb8ee",
      btnBg: "#ff7edb",
      btnText: "#262335",
      track: "#221e30",
    },
  },
  {
    id: "win98",
    name: "ویندوز ۹۸ (تم قدیمی)",
    nameEn: "Windows 98",
    category: "retro",
    dark: false,
    description:
      "دسکتاپ فیروزه‌ای، پنجره‌های نقره‌ای و برجستگی‌های سه‌بعدی کلاسیک",
    source: "98.css (jdan/98.css)",
    icon: "🪟",
    preview: {
      bg: "#008080",
      card: "#c0c0c0",
      card2: "#d4d0c8",
      line: "#808080",
      text: "#000000",
      muted: "#404040",
      accent: "#000080",
      accentSoft: "#c0c0c0",
      accentSoftText: "#000080",
      btnBg: "#c0c0c0",
      btnText: "#000000",
      track: "#a0a0a0",
    },
  },
  {
    id: "pixel",
    name: "پیکسلی ۸-بیتی",
    nameEn: "Pixel 8-bit",
    category: "retro",
    dark: true,
    description:
      "دنیای بازی‌های ۸-بیتی با قاب‌های ضخیم، سایه‌های سخت و فونت پیکسلی (پالت Sweetie16)",
    source: "Lospec Sweetie16",
    icon: "👾",
    preview: {
      bg: "#1a1c2c",
      card: "#333c57",
      card2: "#2a2e48",
      line: "#566c86",
      text: "#f4f4f4",
      muted: "#94b0c2",
      accent: "#38b764",
      accentSoft: "#2e5b48",
      accentSoftText: "#a7f070",
      btnBg: "#38b764",
      btnText: "#1a1c2c",
      track: "#22263a",
    },
  },
  {
    id: "terminal",
    name: "ترمینال CRT",
    nameEn: "Terminal CRT",
    category: "retro",
    dark: true,
    description:
      "نمایشگر فسفر سبز با خطوط اسکن و افکت تاریکی گوشه‌ها، مثل ترمینال‌های قدیمی",
    source: "الهام از ترمینال‌های CRT",
    icon: "🖥️",
    preview: {
      bg: "#051405",
      card: "#0a2010",
      card2: "#0d2a16",
      line: "#1e5b2e",
      text: "#48f76a",
      muted: "#2e8a45",
      accent: "#48f76a",
      accentSoft: "#0f3a1d",
      accentSoftText: "#48f76a",
      btnBg: "#48f76a",
      btnText: "#051405",
      track: "#031003",
    },
  },
];

export const DEFAULT_THEME = "roshd-dark";

export function getTheme(id: string): ThemeDef {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export const FONT_SCALES = [
  { id: "compact", label: "جمع‌وجور", hint: "۹۰٪" },
  { id: "normal", label: "عادی", hint: "۱۰۰٪" },
  { id: "large", label: "بزرگ", hint: "۱۱۲٪" },
  { id: "xl", label: "خیلی بزرگ", hint: "۱۲۵٪" },
] as const;

export type FontScale = (typeof FONT_SCALES)[number]["id"];

export interface AppSettings {
  theme: string;
  fontScale: FontScale;
  reducedMotion: boolean;
  sound: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: DEFAULT_THEME,
  fontScale: "normal",
  reducedMotion: false,
  sound: true,
};
