import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">테니스 전적 관리</h1>
      <p className="text-gray-500">
        동호회 경기 전적을 기록하고, 단식·복식 ELO 레이팅을 자동으로 계산합니다.
      </p>
      <div className="flex gap-3">
        {user ? (
          <>
            <Link href="/matches/new" className="rounded bg-blue-600 px-5 py-2 text-white">
              경기 등록
            </Link>
            <Link href="/profile" className="rounded border px-5 py-2">
              내 프로필
            </Link>
          </>
        ) : (
          <>
            <Link href="/signup" className="rounded bg-blue-600 px-5 py-2 text-white">
              회원가입
            </Link>
            <Link href="/login" className="rounded border px-5 py-2">
              로그인
            </Link>
          </>
        )}
        <Link href="/leaderboard" className="rounded border px-5 py-2">
          리더보드
        </Link>
      </div>
    </main>
  );
}
