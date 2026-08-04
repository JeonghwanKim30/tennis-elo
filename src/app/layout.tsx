import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Barlow_Condensed } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { BackNavigationGuard } from "@/components/BackNavigationGuard";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

// 한글은 지원하지 않는 폰트라 ELO/점수 등 숫자 위주의 "스포츠 스탯" 표기에만 사용한다.
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "테디베어 - 테니스 전적 관리",
  description: "동호회 테니스 전적 및 ELO 레이팅 관리",
  manifest: "/manifest.json",
  icons: {
    icon: "/brand/teddi-logo.png",
    apple: "/brand/teddi-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "테디베어",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#dc2626",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const homePath = user ? "/" : "/login";

  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <BackNavigationGuard homePath={homePath} />
        <NavBar />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
