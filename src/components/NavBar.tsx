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
          <Link href="/matches" className="btn-press">
            경기 목록
          </Link>
          <Link href="/leaderboard" className="btn-press">
            리더보드
          </Link>
          <Link href="/h2h" className="btn-press">
            상대전적
          </Link>
          {user && (
            <Link href="/profile" className="btn-press">
              내 프로필
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="btn-press">
              관리자
            </Link>
          )}
          {user ? (
            <form action={logoutAction}>
              <button type="submit" className="btn-press text-gray-500 underline">
                로그아웃
              </button>
            </form>
          ) : (
            <>
              <Link href="/login" className="btn-press">
                로그인
              </Link>
              <Link href="/signup" className="btn-press">
                회원가입
              </Link>
            </>
          )}
        </NavMenu>
      </nav>
    </header>
  );
}
