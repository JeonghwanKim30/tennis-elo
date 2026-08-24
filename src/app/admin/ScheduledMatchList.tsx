"use client";

import { MatchScoreCard } from "@/components/MatchScoreCard";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { useLoadMore } from "@/lib/useLoadMore";
import type { TeamPlayer } from "@/components/TeamBadges";
import type { MatchType } from "@/generated/prisma/client";
import type { ScoreActionState } from "@/components/MatchScoreCard";

export interface ScheduledMatchItem {
  id: string;
  type: MatchType;
  teamA1: TeamPlayer;
  teamA2?: TeamPlayer | null;
  teamB1: TeamPlayer;
  teamB2?: TeamPlayer | null;
  initialTeamAScore: number | null;
  initialTeamBScore: number | null;
  statusLabel: string;
  action: (prevState: ScoreActionState, formData: FormData) => Promise<ScoreActionState>;
  deleteAction: (formData: FormData) => void | Promise<void>;
}

// 승인 대기 경기가 계속 쌓이는 걸 막기 위해 최근 5개만 먼저 보여주고
// "더보기"로 5개씩 더 연다(useLoadMore 공용 훅).
export function ScheduledMatchList({ items }: { items: ScheduledMatchItem[] }) {
  const { visibleItems, hasMore, showMore } = useLoadMore(items, 5);

  return (
    <>
      <ul className="space-y-3">
        {visibleItems.map((m) => (
          <li key={m.id}>
            <MatchScoreCard
              action={m.action}
              deleteAction={m.deleteAction}
              type={m.type}
              teamA1={m.teamA1}
              teamA2={m.teamA2}
              teamB1={m.teamB1}
              teamB2={m.teamB2}
              initialTeamAScore={m.initialTeamAScore}
              initialTeamBScore={m.initialTeamBScore}
              statusLabel={m.statusLabel}
              submitLabel="승인"
            />
          </li>
        ))}
      </ul>
      <LoadMoreButton hasMore={hasMore} onClick={showMore} />
    </>
  );
}
