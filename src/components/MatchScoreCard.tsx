"use client";

import { useActionState } from "react";
import { MatchupRow } from "@/components/MatchupRow";
import { ScoreStepper } from "@/components/ScoreStepper";
import type { TeamPlayer } from "@/components/TeamBadges";
import type { MatchType } from "@/generated/prisma/client";
import type { Tier } from "@/lib/tier";

export interface ScoreActionState {
  error?: string;
  success?: boolean;
}

const initialState: ScoreActionState = {};

// 예정된 경기의 점수 입력 카드 — 일반 유저의 "결과 제출"과 관리자의 "승인"
// 양쪽에서 공용으로 쓴다(레이아웃/스텝퍼는 동일, action과 버튼 문구만 다름).
export function MatchScoreCard({
  action,
  type,
  teamA1,
  teamA2,
  teamB1,
  teamB2,
  teamA1Tier,
  teamA2Tier,
  teamB1Tier,
  teamB2Tier,
  initialTeamAScore,
  initialTeamBScore,
  statusLabel,
  submitLabel,
  pendingLabel = "처리 중...",
}: {
  action: (prevState: ScoreActionState, formData: FormData) => Promise<ScoreActionState>;
  type: MatchType;
  teamA1: TeamPlayer;
  teamA2?: TeamPlayer | null;
  teamB1: TeamPlayer;
  teamB2?: TeamPlayer | null;
  teamA1Tier?: Tier;
  teamA2Tier?: Tier;
  teamB1Tier?: Tier;
  teamB2Tier?: Tier;
  initialTeamAScore?: number | null;
  initialTeamBScore?: number | null;
  statusLabel: string;
  submitLabel: string;
  pendingLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="surface-card space-y-3 px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{statusLabel}</p>
        <button
          type="submit"
          disabled={pending}
          className="btn-press touch-target shrink-0 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white shadow-sm shadow-primary/25 disabled:opacity-50"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>

      <MatchupRow
        type={type}
        teamA1={teamA1}
        teamA2={teamA2}
        teamB1={teamB1}
        teamB2={teamB2}
        teamA1Tier={teamA1Tier}
        teamA2Tier={teamA2Tier}
        teamB1Tier={teamB1Tier}
        teamB2Tier={teamB2Tier}
        teamAFooter={<ScoreStepper name="teamAScore" defaultValue={initialTeamAScore ?? 0} />}
        teamBFooter={<ScoreStepper name="teamBScore" defaultValue={initialTeamBScore ?? 0} />}
      />

      {state.error && <p className="text-center text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
