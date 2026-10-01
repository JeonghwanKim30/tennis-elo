"use client";

import { memo } from "react";
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
          <RecentMatchRow key={m.id} item={m} />
        ))}
      </ul>
      <LoadMoreButton hasMore={hasMore} onClick={showMore} />
    </>
  );
}

// "더보기"를 누르면 visibleCount만 바뀌는데, 행을 인라인으로 그리면 이미
// 화면에 떠 있던 경기까지 전부 다시 렌더링된다 — 목록이 길어질수록 그 비용이
// 그대로 늘어나므로 행을 memo로 분리한다. items 배열은 서버에서 내려온 그대로라
// 더보기 클릭 사이에 각 item의 객체 참조가 유지되고, item 하나만 prop으로
// 넘기므로 비교도 참조 1개로 끝난다.
const RecentMatchRow = memo(function RecentMatchRow({ item: m }: { item: RecentMatchItem }) {
  return (
    <li className="surface-card px-5 py-4 text-sm">
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
  );
});
