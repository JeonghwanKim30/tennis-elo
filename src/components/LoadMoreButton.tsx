"use client";

// useLoadMore와 짝을 이루는 공용 "더보기" 버튼 — 더 불러올 항목이 없으면
// 자동으로 사라진다(hasMore가 false면 null).
export function LoadMoreButton({
  hasMore,
  onClick,
  label = "경기 더보기",
}: {
  hasMore: boolean;
  onClick: () => void;
  label?: string;
}) {
  if (!hasMore) return null;
  return (
    <div className="flex justify-center pt-1">
      <button
        type="button"
        onClick={onClick}
        className="btn-press touch-target rounded-full bg-muted px-6 py-2.5 text-sm font-medium text-foreground/70 hover:bg-primary/10 hover:text-primary"
      >
        {label} +
      </button>
    </div>
  );
}
