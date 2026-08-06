import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { TennisBearHero } from "@/components/TennisBearHero";
import { TeddiWordmark } from "@/components/TeddiMark";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center">
      <TennisBearHero className="h-56 w-56 sm:h-64 sm:w-64" />
      <TeddiWordmark size="md" />
      <p className="text-muted-foreground">
        동호회 경기 전적을 기록하고, 단식·복식 ELO 레이팅을 자동으로 계산합니다.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {user ? (
          <>
            {/*
              상단 NavTabs의 "활성 탭" 색상(bg-primary text-white)과 똑같은 pill
              스타일을 쓰면, 실제로는 활성 탭이 아닌데도 마치 '경기 목록' 탭이
              이미 선택된 것처럼 보이는 착시가 있었다 — 내 프로필과 같은
              아웃라인 스타일로 통일해 바로가기 버튼일 뿐임을 명확히 한다.
            */}
            <Link
              href="/matches"
              className="btn-press rounded-full border border-border bg-card px-6 py-3 font-medium"
            >
              경기 목록
            </Link>
            <Link
              href="/profile"
              className="btn-press rounded-full border border-border bg-card px-6 py-3 font-medium"
            >
              내 프로필
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/signup"
              className="btn-press lift-on-hover rounded-full bg-primary px-6 py-3 font-medium text-white shadow-md shadow-primary/25"
            >
              회원가입
            </Link>
            <Link
              href="/login"
              className="btn-press rounded-full border border-border bg-card px-6 py-3 font-medium"
            >
              로그인
            </Link>
          </>
        )}
        <Link
          href="/leaderboard"
          className="btn-press rounded-full border border-border bg-card px-6 py-3 font-medium"
        >
          리더보드
        </Link>
      </div>
    </main>
  );
}
