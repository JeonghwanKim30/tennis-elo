"use client";

import { useActionState, useId } from "react";
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
// deleteAction을 주면(관리자 전용) 우상단에 작은 초록 X 삭제 버튼이 제출
// 버튼 바로 오른쪽에 붙는다. 삭제용 <form>과 점수 제출용 <form>은 서로 중첩되면
// 안 되므로(브라우저가 안쪽 제출을 조용히 무시함) 형제로 분리하고, 제출
// 버튼은 form="..." 속성으로 자기 <form> 밖에서도 같은 자리에 나란히 놓는다.
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
  const formId = useId();

  return (
    <div className="surface-card space-y-3 px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{statusLabel}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="submit"
            form={formId}
            disabled={pending}
            className="btn-press touch-target rounded-full bg-primary px-3 py-1 text-xs font-medium text-white shadow-sm shadow-primary/25 disabled:opacity-50"
          >
            {pending ? pendingLabel : submitLabel}
          </button>
          {deleteAction && <SquareDeleteButton action={deleteAction} label="경기 삭제" />}
        </div>
      </div>

      <form id={formId} action={formAction} className="space-y-3">
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
