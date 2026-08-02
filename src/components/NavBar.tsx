import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";

export async function NavBar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          테니스 전적
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/leaderboard">리더보드</Link>
          <Link href="/h2h">상대전적</Link>
          {user && (
            <>
              <Link href="/matches/new">경기 등록</Link>
              <Link href="/profile">내 프로필</Link>
            </>
          )}
          {user?.role === "ADMIN" && <Link href="/admin">관리자</Link>}
          {user ? (
            <form action={logoutAction}>
              <button type="submit" className="text-gray-500 underline">
                로그아웃
              </button>
            </form>
          ) : (
            <>
              <Link href="/login">로그인</Link>
              <Link href="/signup">회원가입</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
