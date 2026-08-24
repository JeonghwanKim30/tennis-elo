"use client";

import { MatchupRow } from "@/components/MatchupRow";
import { SquareDeleteButton } from "@/components/SquareDeleteButton";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { useLoadMore } from "@/lib/useLoadMore";
import type { TeamPlayer } from "@/components/TeamBadges";
import type { MatchType } from "@/generated/prisma/client";

export interface CompletedMatchItem {
  id: string;
  type: MatchType;
  dateTypeLabel: string;
  teamA1: TeamPlayer;
  teamA2?: TeamPlayer | null;
  teamB1: TeamPlayer;
  teamB2?: TeamPlayer | null;
  eloChangeByPlayer: Record<string, number>;
  resultLabel?: string;
  scoreLabel?: string;
  deleteAction: (formData: FormData) => void | Promise<void>;
}

// 완료된 경기 목록이 계속 쌓이는 걸 막기 위해 최근 5개만 먼저 보여주고
// "더보기"로 5개씩 더 연다(useLoadMore 공용 훅). DB 조회 자체도 최근
// 30건으로 이미 상한을 뒀지만(ScoreSection.tsx), 그중에서도 화면엔
// 5개씩만 순차로 펼친다.
export function CompletedMatchList({ items }: { items: CompletedMatchItem[] }) {
  const { visibleItems, hasMore, showMore } = useLoadMore(items, 5);

  return (
    <>
      <ul className="space-y-3">
        {visibleItems.map((m) => (
          <li key={m.id} className="surface-card space-y-3 px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{m.dateTypeLabel}</p>
              <SquareDeleteButton action={m.deleteAction} label="경기 삭제" />
            </div>
            <MatchupRow
              type={m.type}
              teamA1={m.teamA1}
              teamA2={m.teamA2}
              teamB1={m.teamB1}
              teamB2={m.teamB2}
              eloChangeByPlayer={m.eloChangeByPlayer}
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
