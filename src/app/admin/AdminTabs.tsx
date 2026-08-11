import Link from "next/link";

export type AdminTab = "register" | "score" | "signups" | "users";

const TABS: { key: AdminTab; label: string }[] = [
  { key: "score", label: "경기 승패 입력" },
  { key: "register", label: "경기 등록" },
  { key: "signups", label: "가입 승인" },
  { key: "users", label: "유저 관리" },
];

export function AdminTabs({ active }: { active: AdminTab }) {
  return (
    <nav
      aria-label="관리자 메뉴"
      className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
    >
      {TABS.map(({ key, label }) => (
        <Link
          key={key}
          href={key === "score" ? "/admin" : `/admin?tab=${key}`}
          aria-current={active === key ? "page" : undefined}
          className={`tab-pill btn-press touch-target shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap ${
            active === key ? "bg-primary text-white shadow-sm shadow-primary/30" : "bg-muted text-foreground/70"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
