import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import localFont from "next/font/local";
import { DEFAULT_PROGRAM } from "@/components/config/programs";
import { t } from "@/components/i18n";
import { BottomTabBar } from "@/components/nav/bottom-tab-bar";
import { SiteHeader } from "@/components/nav/site-header";
import "./globals.css";

// Pretendard Variable — hỗ trợ Hangul + Latin (tiếng Việt có dấu).
// Noto Sans KR chỉ là tên dự phòng trong font stack (app/globals.css), không tải từ mạng.
const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

// Nunito cho tiếng Việt: nét tròn, thân thiện với học sinh sinh viên, đủ dấu tiếng Việt.
// next/font tải về lúc build và tự phục vụ từ cùng tên miền (không gọi Google lúc chạy).
const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  variable: "--font-nunito",
  display: "swap",
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: `${t.brand.name} · ${t.brand.tagline}`,
    template: `%s · ${t.brand.name}`,
  },
  description: t.meta.description(DEFAULT_PROGRAM.name),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Cần để env(safe-area-inset-*) có giá trị trên iOS (tai thỏ, thanh home).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1b26" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${nunito.variable} ${pretendard.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="skip-link">
          {t.a11y.skipToContent}
        </a>
        <Suspense fallback={<div className="h-(--header-height)" />}>
          <SiteHeader />
        </Suspense>
        <main id="main" className="flex flex-1 flex-col pb-tabbar">
          {children}
        </main>
        <Suspense fallback={null}>
          <BottomTabBar />
        </Suspense>
      </body>
    </html>
  );
}
