"use client";

import { memo, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { TrashIcon } from "@/components/icons";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
  thumbnailSrc: string | null;
  photoCount: number;
}

// 경기 일자 카드 목록. "내가 참여하는 경기만" 필터와 "더보기" 페이지네이션은
// 서버가 scope(전체/다가오는/지난)로 이미 걸러 내려준 days 배열 안에서 순수
// 배열 연산(filter/slice)으로 끝나는 조건이라, 예전처럼 <Link>로 서버를
// 다시 왕복하지 않고 여기서 useState/useMemo로 즉시 처리한다 — scope만 바뀌면
// 실제로 다른 DB 쿼리가 필요하므로 그건 그대로 matches/page.tsx의 서버 탭으로
// 남겨둔다.
export function MatchDayList({
  days: initialDays,
  isAdmin,
  deleteAction,
  currentUserId,
  pageSize,
}: {
  days: MatchDayListItem[];
  isAdmin: boolean;
  deleteAction: (dayId: string) => Promise<void>;
  currentUserId?: string;
  pageSize: number;
}) {
  const [days, setDays] = useState(initialDays);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [confirmTarget, setConfirmTarget] = useState<MatchDayListItem | null>(null);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const [mineOnly, setMineOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // days(scope 변경으로 서버에서 새 목록이 내려옴) 또는 mineOnly가 바뀔 때만
  // 다시 계산한다 — 필터 자체는 이미 갖고 있는 배열에 대한 단순 filter라
  // 매 렌더마다 다시 돌 이유가 없다.
  const filteredDays = useMemo(
    () =>
      mineOnly && currentUserId
        ? days.filter((d) => d.attending.some((p) => p.id === currentUserId))
        : days,
    [days, mineOnly, currentUserId]
  );
  const visibleDays = useMemo(() => filteredDays.slice(0, visibleCount), [filteredDays, visibleCount]);
  const hasMore = filteredDays.length > visibleDays.length;

  const toggleMineOnly = useCallback(() => {
    setMineOnly((v) => !v);
    setVisibleCount(pageSize); // 필터가 바뀌면 페이지네이션도 처음부터 다시 보여준다.
  }, [pageSize]);
  const showMore = useCallback(() => setVisibleCount((c) => c + pageSize), [pageSize]);

  const requestDelete = useCallback((day: MatchDayListItem) => setConfirmTarget(day), []);

  function confirmDelete() {
    if (!confirmTarget) return;
    const dayId = confirmTarget.id;
    const dateLabel = confirmTarget.dateLabel;
    setConfirmTarget(null);
    // 서버 응답을 기다리지 않고 즉시 페이드아웃부터 보여준다(낙관적 업데이트).
    // 실제로 목록(days)에서 완전히 빼는 건 성공을 확인한 뒤에만 하고, 실패하면
    // removingIds만 되돌려 원래 있던 자리에 그대로 다시 나타나게 한다 — 삭제
    // 순서/정렬을 복원하는 로직 없이도 정확히 롤백된다.
    setRemovingIds((prev) => new Set(prev).add(dayId));
    startTransition(async () => {
      try {
        await deleteAction(dayId);
        setToast({ message: `${dateLabel} 경기 일자가 삭제되었습니다.` });
        setTimeout(() => {
          setDays((prev) => prev.filter((d) => d.id !== dayId));
        }, REMOVE_ANIMATION_MS);
      } catch {
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(dayId);
          return next;
        });
        setToast({ message: "삭제에 실패했습니다. 다시 시도해주세요.", error: true });
      }
    });
  }

  return (
    <>
      {currentUserId && (
        <div className="mb-3 flex justify-center sm:justify-start">
          <button
            type="button"
            onClick={toggleMineOnly}
            aria-pressed={mineOnly}
            className={`tab-pill btn-press touch-target rounded-full px-4 py-2 text-xs font-medium ${
              mineOnly ? "bg-accent/40 text-accent-foreground" : "bg-muted text-foreground/70"
            }`}
          >
            {mineOnly ? "✓ 내가 참여하는 경기만" : "내가 참여하는 경기만 보기"}
          </button>
        </div>
      )}

      <ul className="min-h-[160px] space-y-3">
        {visibleDays.length === 0 && (
          <p className="text-sm text-muted-foreground">해당하는 경기일이 없습니다.</p>
        )}
        {visibleDays.map((d) => (
          <MatchDayCard
            key={d.id}
            day={d}
            isAdmin={isAdmin}
            isRemoving={removingIds.has(d.id)}
            onRequestDelete={requestDelete}
          />
        ))}
      </ul>

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={showMore}
            className="btn-press touch-target rounded-full bg-muted px-6 py-2.5 text-sm font-medium text-foreground/70"
          >
            더보기 ({filteredDays.length - visibleDays.length}개 더 있음)
          </button>
        </div>
      )}

      {confirmTarget && (
        <ConfirmDialog
          title="경기 일자를 삭제하시겠습니까?"
          description={`해당 일자(${confirmTarget.dateLabel})에 등록된 모든 경기 데이터와 참석 투표 내역이 함께 삭제되며, 이 작업은 복구할 수 없습니다.`}
          confirmLabel="삭제 확인"
          onCancel={() => setConfirmTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {toast && (
        <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
          <div
            className={`surface-card px-4 py-3 text-center text-sm font-medium shadow-lg ${
              toast.error ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10 text-primary"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}

// "내가 참여하는 경기만" 필터를 켜고 끄거나 "더보기"를 눌러도, 이미 화면에
// 떠 있던 카드는 자기 props(day/isAdmin/isRemoving)가 실제로 안 바뀌면 다시
// 그리지 않는다 — 경기일이 늘어날수록 카드 개수도 그대로 늘어나는 리스트라,
// 필터 전환마다 전부 재렌더링하면 그 자체가 버벅임의 원인이 된다.
const MatchDayCard = memo(function MatchDayCard({
  day,
  isAdmin,
  isRemoving,
  onRequestDelete,
}: {
  day: MatchDayListItem;
  isAdmin: boolean;
  isRemoving: boolean;
  onRequestDelete: (day: MatchDayListItem) => void;
}) {
  return (
    <li
      className={`surface-card relative transition-all duration-200 ease-out ${
        isRemoving ? "-translate-x-2 opacity-0" : "opacity-100"
      }`}
    >
      <Link
        href={`/matches/${day.id}`}
        prefetch
        className={`btn-press block space-y-2.5 px-5 py-4 ${isAdmin ? "pr-14" : ""}`}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate font-medium">{day.dateLabel}</span>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {day.dDayLabel}
            </span>
            {(day.time || day.location) && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {[day.time, day.location].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
          {day.thumbnailSrc && (
            <div className="group relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={day.thumbnailSrc}
                alt=""
                className="h-12 w-12 rounded-xl border border-emerald-100/50 object-cover shadow-sm transition-transform duration-200 ease-out group-hover:scale-105 group-active:scale-105"
              />
              <span className="absolute -right-1.5 -bottom-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 shadow-sm">
                📷 {day.photoCount}
              </span>
            </div>
          )}
        </div>
        <DayParticipantsPreview participants={day.attending} />
      </Link>
      {isAdmin && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onRequestDelete(day);
          }}
          aria-label={`${day.dateLabel} 경기 일자 삭제`}
          className="btn-press touch-target absolute top-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      )}
    </li>
  );
});
