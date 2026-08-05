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
            <Link
              href="/matches"
              className="btn-press lift-on-hover rounded-full bg-primary px-6 py-3 font-medium text-white shadow-md shadow-primary/25"
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
