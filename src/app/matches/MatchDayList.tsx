"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { TrashIcon } from "@/components/icons";
import { DayParticipantsPreview, type DayParticipant } from "./DayParticipantsPreview";

const REMOVE_ANIMATION_MS = 200;
const TOAST_DURATION_MS = 3000;

export interface MatchDayListItem {
  id: string;
  dateLabel: string;
  dDayLabel: string;
  time: string | null;
  location: string | null;
  attending: DayParticipant[];
}

// 경기 일자 카드 목록. 관리자에게만 카드 우측 상단에 삭제 버튼이 보이고,
// 클릭하면 확인 모달 -> 서버 액션 호출과 동시에(응답을 기다리지 않고) 즉시
// 애니메이션과 함께 목록에서 제거 + 성공 토스트를 띄운다(다른 관리자 화면의
// 낙관적 삭제 패턴과 동일). 필터/페이지네이션이 바뀌어 서버에서 새 목록이
// 내려오면 내부 상태를 다시 동기화해야 하므로, 호출하는 쪽(matches/page.tsx)이
// scope·mine·limit이 바뀔 때마다 다른 key를 넘겨 이 컴포넌트를 통째로
// 리마운트시킨다(AttendanceCarousel과 같은 패턴).
export function MatchDayList({
  days: initialDays,
  isAdmin,
  deleteAction,
}: {
  days: MatchDayListItem[];
  isAdmin: boolean;
  deleteAction: (dayId: string) => Promise<void>;
}) {
  const [days, setDays] = useState(initialDays);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [confirmTarget, setConfirmTarget] = useState<MatchDayListItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  function confirmDelete() {
    if (!confirmTarget) return;
    const dayId = confirmTarget.id;
    const dateLabel = confirmTarget.dateLabel;
    setConfirmTarget(null);
    setRemovingIds((prev) => new Set(prev).add(dayId));
    startTransition(() => {
      deleteAction(dayId);
    });
    setToast(`${dateLabel} 경기 일자가 삭제되었습니다.`);
    setTimeout(() => {
      setDays((prev) => prev.filter((d) => d.id !== dayId));
    }, REMOVE_ANIMATION_MS);
  }

  return (
    <>
      <ul className="space-y-3">
        {days.length === 0 && (
          <p className="text-sm text-muted-foreground">해당하는 경기일이 없습니다.</p>
        )}
        {days.map((d) => (
          <li
            key={d.id}
            className={`surface-card relative transition-all duration-200 ease-out ${
              removingIds.has(d.id) ? "-translate-x-2 opacity-0" : "opacity-100"
            }`}
          >
            <Link
              href={`/matches/${d.id}`}
              className={`btn-press block space-y-2.5 px-5 py-4 ${isAdmin ? "pr-14" : ""}`}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate font-medium">{d.dateLabel}</span>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {d.dDayLabel}
                </span>
                {(d.time || d.location) && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {[d.time, d.location].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
              <DayParticipantsPreview participants={d.attending} />
            </Link>
            {isAdmin && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setConfirmTarget(d);
                }}
                aria-label={`${d.dateLabel} 경기 일자 삭제`}
                className="btn-press touch-target absolute top-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {confirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => setConfirmTarget(null)}
        >
          <div
            className="surface-card w-full max-w-sm p-5"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-day-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="delete-day-title" className="mb-1 font-semibold">
              경기 일자를 삭제하시겠습니까?
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              해당 일자({confirmTarget.dateLabel})에 등록된 모든 경기 데이터와 참석 투표 내역이
              함께 삭제되며, 이 작업은 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="btn-press touch-target rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground/70"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="btn-press touch-target rounded-full bg-destructive px-4 py-2 text-sm font-medium text-white"
              >
                삭제 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
          <div className="surface-card border-primary/30 bg-primary/10 px-4 py-3 text-center text-sm font-medium text-primary shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
