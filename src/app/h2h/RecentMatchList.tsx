"use client";

import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { useLoadMore } from "@/lib/useLoadMore";
import type { TeamPlayer } from "@/components/TeamBadges";

export interface RecentMatchItem {
  id: string;
  typeLabel: string;
  dateLabel: string;
  outcomeLabel: string;
  scoreLabel: string;
  opponents: TeamPlayer[];
}

// "최근 경기" 목록이 상대전적을 조회할 때마다 계속 쌓이는 걸 막기 위해
// 최근 5개만 먼저 보여주고 "더보기"로 5개씩 더 연다(useLoadMore 공용 훅).
export function RecentMatchList({ items }: { items: RecentMatchItem[] }) {
  const { visibleItems, hasMore, showMore } = useLoadMore(items, 5);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">완료된 경기가 없습니다.</p>;
  }

  return (
    <>
      <ul className="space-y-3">
        {visibleItems.map((m) => (
          <li key={m.id} className="surface-card px-5 py-4 text-sm">
            <p className="mb-2 text-muted-foreground">
              {m.typeLabel} · {m.dateLabel}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {m.opponents.map((p) => (
                  <Link key={p.id} href={`/profile/${p.id}`} className="btn-press flex max-w-[6rem] items-center gap-1">
                    <Avatar src={p.avatarSrc} size="sm" />
                    <span className="truncate">{p.name}</span>
                  </Link>
                ))}
              </div>
              <span className="font-medium">
                — {m.outcomeLabel}
                {m.scoreLabel}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <LoadMoreButton hasMore={hasMore} onClick={showMore} />
    </>
  );
}
