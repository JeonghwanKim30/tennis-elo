import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Barlow_Condensed } from "next/font/google";
import { NavBar } from "@/components/NavBar";
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
  title: "테디비 - 테니스 전적 관리",
  description: "동호회 테니스 전적 및 ELO 레이팅 관리",
  icons: {
    icon: "/brand/teddi-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <NavBar />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
