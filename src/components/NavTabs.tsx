"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavTabItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

// 모바일/데스크톱 구분 없이 상단에 항상 보이는 "탭" 형태의 메뉴.
// 화면이 좁으면 가로 스크롤, 넓으면 자연스럽게 한 줄에 펼쳐진다(햄버거 메뉴 없음).
export function NavTabs({ items }: { items: NavTabItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
    >
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`tab-pill btn-press touch-target shrink-0 rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "bg-muted text-foreground/70"
            }`}
          >
            <span className="[&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
