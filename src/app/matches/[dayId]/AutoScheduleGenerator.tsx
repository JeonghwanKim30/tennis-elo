"use client";

import { useState } from "react";
import { PlayerBadge } from "@/components/PlayerBadge";
import type { TeamPlayer } from "@/components/TeamBadges";
import { previewDoublesScheduleAction, type ProposedMatch } from "./actions";
import { AutoScheduleReviewModal } from "./AutoScheduleReviewModal";

const MIN_PARTICIPANTS = 4;

// "경기 추가"(MatchComposerPanel)와 나란히 놓이는 관리자 전용 기능 — 참가자를
// 고르고 경기 수를 입력하면 서버에서 ELO 기반 복식 대진표를 계산해(DB 미기록)
// 검토 모달을 띄운다. 실제 등록은 그 모달의 "최종 승인"에서만 일어난다.
export function AutoScheduleGenerator({ dayId, participants }: { dayId: string; participants: TeamPlayer[] }) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(participants.map((p) => p.id)));
  const [matchCount, setMatchCount] = useState(4);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewMatches, setReviewMatches] = useState<ProposedMatch[] | null>(null);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canGenerate = selectedIds.size >= MIN_PARTICIPANTS && Number.isInteger(matchCount) && matchCount >= 1;

  async function handleGenerate() {
    setPending(true);
    setError(null);
    const result = await previewDoublesScheduleAction(dayId, Array.from(selectedIds), matchCount);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setReviewMatches(result.matches ?? []);
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">복식 대진표 자동 생성</h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "자동 생성 닫기" : "자동 생성 열기"}
          className="btn-press touch-target flex items-center justify-center rounded-full bg-primary text-xl leading-none text-white shadow-md shadow-primary/25"
        >
          {open ? "×" : "+"}
        </button>
      </div>

      {open &&
        (participants.length < MIN_PARTICIPANTS ? (
          <p className="text-sm text-muted-foreground">
            &ldquo;참여&rdquo;를 선택한 회원이 {MIN_PARTICIPANTS}명 이상이어야 대진표를 생성할 수 있습니다.
          </p>
        ) : (
          <div className="surface-card space-y-4 p-4">
            <div>
              <p className="mb-2 text-sm font-medium">참가자 선택 ({selectedIds.size}명)</p>
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {participants.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={`btn-press rounded-2xl p-1.5 ${
                      selectedIds.has(p.id) ? "bg-accent/30 ring-2 ring-accent" : "opacity-40"
                    }`}
                  >
                    <PlayerBadge avatarSrc={p.avatarSrc} name={p.name} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium" htmlFor="auto-schedule-match-count">
                생성할 경기 수
              </label>
              <input
                id="auto-schedule-match-count"
                type="number"
                min={1}
                value={matchCount}
                onChange={(e) => setMatchCount(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>

            <p className="text-xs text-muted-foreground">선택 인원이 적으면 같은 조합이 반복될 수 있어요.</p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={pending || !canGenerate}
              className="btn-press lift-on-hover touch-target w-full rounded-full bg-primary py-3 font-medium text-white shadow-md shadow-primary/25 disabled:opacity-50"
            >
              {pending ? "생성 중..." : "자동 생성"}
            </button>
          </div>
        ))}

      {reviewMatches && (
        <AutoScheduleReviewModal
          dayId={dayId}
          matches={reviewMatches}
          onClose={() => setReviewMatches(null)}
          onCommitted={() => {
            setReviewMatches(null);
            setOpen(false);
          }}
        />
      )}
    </section>
  );
}
