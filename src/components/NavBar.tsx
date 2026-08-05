import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";
import { NavTabs, type NavTabItem } from "@/components/NavTabs";
import {
  AdminIcon,
  H2HIcon,
  LeaderboardIcon,
  LoginIcon,
  LogoutIcon,
  MatchesIcon,
  ProfileIcon,
  SignupIcon,
} from "@/components/icons";

export async function NavBar() {
  const user = await getCurrentUser();

  const items: NavTabItem[] = [
    { href: "/matches", label: "경기 목록", icon: <MatchesIcon /> },
    { href: "/leaderboard", label: "리더보드", icon: <LeaderboardIcon /> },
    { href: "/h2h", label: "상대전적", icon: <H2HIcon /> },
  ];
  if (user) {
    items.push({ href: "/profile", label: "내 프로필", icon: <ProfileIcon /> });
  }
  if (user?.role === "ADMIN") {
    items.push({ href: "/admin", label: "관리자", icon: <AdminIcon /> });
  }
  if (!user) {
    items.push({ href: "/login", label: "로그인", icon: <LoginIcon /> });
    items.push({ href: "/signup", label: "회원가입", icon: <SignupIcon /> });
  }

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto max-w-4xl space-y-3 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="btn-press flex items-center gap-2 text-lg font-bold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/teddi-logo.png" alt="" className="h-8 w-8 rounded-full object-cover" />
            테디베어
          </Link>
          {user && (
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="로그아웃"
                className="btn-press touch-target flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                <LogoutIcon className="h-4 w-4" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </form>
          )}
        </div>
        <NavTabs items={items} />
      </div>
    </header>
  );
}
