"use client";

import { useState } from "react";
import { ModalOverlay } from "@/components/ModalOverlay";
import { ModalHeader } from "@/components/ModalHeader";
import { MatchupRow } from "@/components/MatchupRow";
import { commitDoublesScheduleAction, type ProposedMatch } from "./actions";

// 자동 생성된 대진표를 검토하고 승인하는 모달 — 카드 자체는 기존
// MatchupRow를 그대로 재사용해서 다른 경기 카드와 룩이 완전히 같다.
export function AutoScheduleReviewModal({
  dayId,
  matches,
  onClose,
  onCommitted,
}: {
  dayId: string;
  matches: ProposedMatch[];
  onClose: () => void;
  onCommitted: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const result = await commitDoublesScheduleAction(
      dayId,
      matches.map((m) => ({
        teamA1Id: m.teamA1.id,
        teamA2Id: m.teamA2.id,
        teamB1Id: m.teamB1.id,
        teamB2Id: m.teamB2.id,
      }))
    );
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    onCommitted();
  }

  return (
    <ModalOverlay
      onClose={onClose}
      labelledBy="auto-schedule-review-title"
      panelClassName="surface-card flex max-h-[85vh] w-full max-w-lg flex-col p-6"
    >
      <ModalHeader id="auto-schedule-review-title" title={`자동 생성된 대진표 (${matches.length}경기)`} onClose={onClose} />

      <div className="-mx-1 min-h-0 flex-1 space-y-3 overflow-y-auto px-1">
        {matches.map((m, i) => (
          <div key={i} className="surface-card p-4">
            <MatchupRow
              type="DOUBLES"
              teamA1={m.teamA1}
              teamA2={m.teamA2}
              teamB1={m.teamB1}
              teamB2={m.teamB2}
              teamA1Tier={m.teamA1Tier}
              teamA2Tier={m.teamA2Tier}
              teamB1Tier={m.teamB1Tier}
              teamB2Tier={m.teamB2Tier}
              resultLabel={`Match ${i + 1}`}
              scoreLabel={`ELO 격차 ${m.eloDiff}`}
            />
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="btn-press touch-target rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground/70 disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="btn-press touch-target rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-md shadow-primary/25 disabled:opacity-50"
        >
          {pending ? "등록 중..." : "최종 승인"}
        </button>
      </div>
    </ModalOverlay>
  );
}
