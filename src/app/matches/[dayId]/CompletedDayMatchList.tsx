"use client";

import { MatchupRow } from "@/components/MatchupRow";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { useLoadMore } from "@/lib/useLoadMore";
import type { TeamPlayer } from "@/components/TeamBadges";
import type { MatchType } from "@/generated/prisma/client";
import type { Tier } from "@/lib/tier";

export interface CompletedDayMatchItem {
  id: string;
  type: MatchType;
  typeLabel: string;
  teamA1: TeamPlayer;
  teamA2?: TeamPlayer | null;
  teamB1: TeamPlayer;
  teamB2?: TeamPlayer | null;
  teamA1Tier?: Tier;
  teamA2Tier?: Tier;
  teamB1Tier?: Tier;
  teamB2Tier?: Tier;
  eloChangeByPlayer: Record<string, number>;
  resultLabel?: string;
  scoreLabel?: string;
}

// 완료된 경기 목록이 계속 쌓이는 걸 막기 위해 최근 5개만 먼저 보여주고
// "더보기"로 5개씩 더 연다(useLoadMore 공용 훅).
export function CompletedDayMatchList({ items }: { items: CompletedDayMatchItem[] }) {
  const { visibleItems, hasMore, showMore } = useLoadMore(items, 5);

  return (
    <>
      <ul className="space-y-3">
        {visibleItems.map((m) => (
          <li key={m.id} className="surface-card px-5 py-4">
            <p className="mb-2 text-sm text-muted-foreground">{m.typeLabel}</p>
            <MatchupRow
              type={m.type}
              teamA1={m.teamA1}
              teamA2={m.teamA2}
              teamB1={m.teamB1}
              teamB2={m.teamB2}
              eloChangeByPlayer={m.eloChangeByPlayer}
              teamA1Tier={m.teamA1Tier}
              teamA2Tier={m.teamA2Tier}
              teamB1Tier={m.teamB1Tier}
              teamB2Tier={m.teamB2Tier}
              resultLabel={m.resultLabel}
              scoreLabel={m.scoreLabel}
            />
          </li>
        ))}
      </ul>
      <LoadMoreButton hasMore={hasMore} onClick={showMore} />
    </>
  );
}
