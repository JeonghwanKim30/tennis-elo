"use client";

import { useRef, useState } from "react";

const SWIPE_THRESHOLD_PX = 40;

// 참석 여부 명단이 길어지지 않도록 부모가 9명씩 미리 잘라 페이지(ReactNode) 배열로
// 넘겨주면, 이 컴포넌트는 좌우 스와이프/화살표/점 인디케이터로 페이지만 넘겨준다.
// (회원 카드 자체는 서버 액션이 걸린 폼을 포함하므로, 여기서 새로 그리지 않고
// 서버 컴포넌트가 미리 렌더링해 둔 조각을 그대로 받는다.)
export function AttendanceCarousel({ pages }: { pages: React.ReactNode[] }) {
  const [page, setPage] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const totalPages = pages.length;

  function goTo(index: number) {
    setPage(Math.max(0, Math.min(totalPages - 1, index)));
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (deltaX > SWIPE_THRESHOLD_PX) goTo(page - 1);
    else if (deltaX < -SWIPE_THRESHOLD_PX) goTo(page + 1);
  }

  if (totalPages === 0) return null;
  if (totalPages === 1) return <>{pages[0]}</>;

  return (
    <div>
      <div className="overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {pages.map((pageContent, i) => (
            <div key={i} className="w-full shrink-0">
              {pageContent}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page === 0}
          aria-label="이전 페이지"
          className="btn-press touch-target flex h-9 w-9 items-center justify-center rounded-full bg-muted text-lg leading-none text-foreground/70 disabled:opacity-30"
        >
          ‹
        </button>
        <div className="flex gap-1.5">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`${i + 1}번째 페이지`}
              aria-current={i === page}
              className={`h-2 w-2 rounded-full transition-colors ${i === page ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages - 1}
          aria-label="다음 페이지"
          className="btn-press touch-target flex h-9 w-9 items-center justify-center rounded-full bg-muted text-lg leading-none text-foreground/70 disabled:opacity-30"
        >
          ›
        </button>
      </div>
    </div>
  );
}
