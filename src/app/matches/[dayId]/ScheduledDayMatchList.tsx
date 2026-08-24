"use client";

import { MatchupRow } from "@/components/MatchupRow";
import { MatchScoreCard, type ScoreActionState } from "@/components/MatchScoreCard";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { useLoadMore } from "@/lib/useLoadMore";
import type { TeamPlayer } from "@/components/TeamBadges";
import type { MatchType } from "@/generated/prisma/client";
import type { Tier } from "@/lib/tier";

export interface ScheduledDayMatchItem {
  id: string;
  type: MatchType;
  teamA1: TeamPlayer;
  teamA2?: TeamPlayer | null;
  teamB1: TeamPlayer;
  teamB2?: TeamPlayer | null;
  teamA1Tier?: Tier;
  teamA2Tier?: Tier;
  teamB1Tier?: Tier;
  teamB2Tier?: Tier;
  typeLabel: string;
  statusLabel: string;
  initialTeamAScore: number | null;
  initialTeamBScore: number | null;
  /** 로그인 사용자만 존재 — 결과 제출용 서버 액션. */
  action?: (prevState: ScoreActionState, formData: FormData) => Promise<ScoreActionState>;
  /** 관리자만 존재 — 경기 삭제용 서버 액션. */
  deleteAction?: (formData: FormData) => void | Promise<void>;
}

// 예정된 경기 목록이 계속 쌓이는 걸 막기 위해 최근 5개만 먼저 보여주고
// "더보기"로 5개씩 더 연다(useLoadMore 공용 훅). 로그인 여부에 따라
// 점수를 직접 입력할 수 있는 MatchScoreCard(로그인)와 읽기 전용
// MatchupRow(비로그인)를 나눠 보여준다.
export function ScheduledDayMatchList({ items }: { items: ScheduledDayMatchItem[] }) {
  const { visibleItems, hasMore, showMore } = useLoadMore(items, 5);

  return (
    <>
      <ul className="space-y-3">
        {visibleItems.map((m) =>
          m.action ? (
            <li key={m.id}>
              <MatchScoreCard
                action={m.action}
                deleteAction={m.deleteAction}
                type={m.type}
                teamA1={m.teamA1}
                teamA2={m.teamA2}
                teamB1={m.teamB1}
                teamB2={m.teamB2}
                teamA1Tier={m.teamA1Tier}
                teamA2Tier={m.teamA2Tier}
                teamB1Tier={m.teamB1Tier}
                teamB2Tier={m.teamB2Tier}
                initialTeamAScore={m.initialTeamAScore}
                initialTeamBScore={m.initialTeamBScore}
                statusLabel={m.statusLabel}
                submitLabel="결과 제출"
              />
            </li>
          ) : (
            <li key={m.id} className="surface-card px-5 py-4">
              <p className="mb-2 text-sm text-muted-foreground">{m.typeLabel} · 점수 입력 대기 중</p>
              <MatchupRow
                type={m.type}
                teamA1={m.teamA1}
                teamA2={m.teamA2}
                teamB1={m.teamB1}
                teamB2={m.teamB2}
                teamA1Tier={m.teamA1Tier}
                teamA2Tier={m.teamA2Tier}
                teamB1Tier={m.teamB1Tier}
                teamB2Tier={m.teamB2Tier}
              />
            </li>
          )
        )}
      </ul>
      <LoadMoreButton hasMore={hasMore} onClick={showMore} />
    </>
  );
}
