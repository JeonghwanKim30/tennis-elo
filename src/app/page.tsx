import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-24 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/teddi-logo.png"
        alt="테디베어"
        className="h-24 w-24 rounded-full object-cover shadow-lg shadow-primary/20"
      />
      <h1 className="text-3xl font-bold text-primary">테디베어</h1>
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
