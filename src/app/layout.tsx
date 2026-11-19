import type { Metadata, Viewport } from "next";
import { Vazirmatn, Press_Start_2P, VT323, Roboto } from "next/font/google";
import "./globals.css";
import "./calm.css";
import "./calm-school.css";
import "./calm-admin.css";
import "./calm-growth.css";

const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-vazir",
  display: "swap",
});

const pixelFont = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pixel",
  display: "swap",
});

const crtFont = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-crt",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "مسیر رشد | ماموریت روزانه",
  description:
    "هر روز چهار ماموریت کوتاه، متناسب با رشته و سطح تو — همراه با پوسته‌های متنوع از زبان‌های طراحی گوگل و اپل تا تم‌های قدیمی و پیکسلی.",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07100c" },
    { media: "(prefers-color-scheme: light)", color: "#eef6f1" },
  ],
};

/**
 * اسکریپت درون‌خطی ضد-فلش: تم ذخیره‌شده را قبل از هیدراسیون روی <html>
 * اعمال می‌کند تا صفحه بدون پرش رنگی نمایش داده شود.
 */
const themeInitScript = `(function(){try{var s=JSON.parse(localStorage.getItem('roshd-settings')||'null');var t=s&&s.theme?String(s.theme):'roshd-dark';document.documentElement.setAttribute('data-theme',t);if(s&&s.fontScale&&s.fontScale!=='normal'){document.documentElement.setAttribute('data-fontscale',s.fontScale);}if(s&&s.reducedMotion){document.documentElement.setAttribute('data-motion','reduced');}}catch(e){document.documentElement.setAttribute('data-theme','roshd-dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      data-theme="roshd-dark"
      className={`${vazir.variable} ${pixelFont.variable} ${crtFont.variable} ${roboto.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
