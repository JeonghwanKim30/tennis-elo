"use client";

import { useActionState } from "react";
import { MatchupRow } from "@/components/MatchupRow";
import { ScoreStepper } from "@/components/ScoreStepper";
import { SquareDeleteButton } from "@/components/SquareDeleteButton";
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
// deleteAction을 주면(관리자 전용) 카드 모서리에 네모 X 삭제 버튼이 붙는다 —
// 점수 제출용 <form>과는 형제로 분리해 렌더링한다(<form> 중첩은 브라우저가
// 조용히 안쪽 제출을 무시해버리는 문제가 있어 이 프로젝트에서 항상 피한다).
export function MatchScoreCard({
  action,
  deleteAction,
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
  deleteAction?: (formData: FormData) => void | Promise<void>;
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
    <div className="surface-card relative space-y-3 px-5 py-4">
      {deleteAction && <SquareDeleteButton action={deleteAction} label="경기 삭제" />}

      <form action={formAction} className="space-y-3">
        <div className={`flex items-center justify-between gap-2 ${deleteAction ? "pr-9" : ""}`}>
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
          // 다른 유저가 방금 새 점수를 제출해 서버가 새로운 initialTeamXScore를
          // 내려줘도, 이미 마운트된 스테퍼는 자기 내부 state(useState 초기값)를
          // 스스로 갱신하지 않는다 — 점수가 바뀔 때마다 key를 바꿔 강제로
          // 리마운트시켜서 화면이 항상 최신 제출값을 보여주게 한다.
          teamASideControl={
            <ScoreStepper key={initialTeamAScore ?? 0} name="teamAScore" defaultValue={initialTeamAScore ?? 0} />
          }
          teamBSideControl={
            <ScoreStepper key={initialTeamBScore ?? 0} name="teamBScore" defaultValue={initialTeamBScore ?? 0} />
          }
        />

        {state.error && <p className="text-center text-xs text-destructive">{state.error}</p>}
      </form>
    </div>
  );
}
