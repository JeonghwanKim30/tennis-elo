import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Barlow_Condensed } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { ConditionalNavBar } from "@/components/ConditionalNavBar";
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
  // 파비콘/애플 터치 아이콘은 src/app/icon.png, src/app/apple-icon.png,
  // src/app/favicon.ico 파일 컨벤션으로 Next.js가 자동으로 <link> 태그를
  // 생성해준다(scripts/generate-brand-icons.mjs로 생성) — 여기서 별도로
  // 지정하지 않는다.
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
  themeColor: "#2fbf71",
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
        <ConditionalNavBar>
          <NavBar />
        </ConditionalNavBar>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
