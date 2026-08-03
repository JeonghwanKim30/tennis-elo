import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";
import { NavMenu } from "@/components/NavMenu";

export async function NavBar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/teddi-icon.png" alt="" className="h-8 w-8 rounded-full" />
          테디비
        </Link>
        <NavMenu>
          <Link href="/matches">경기 목록</Link>
          <Link href="/leaderboard">리더보드</Link>
          <Link href="/h2h">상대전적</Link>
          {user && <Link href="/profile">내 프로필</Link>}
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
        </NavMenu>
      </nav>
    </header>
  );
}
