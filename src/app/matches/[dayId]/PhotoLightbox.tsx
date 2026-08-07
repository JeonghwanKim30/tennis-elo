"use client";

import { useRef } from "react";
import { CloseIcon, TrashIcon } from "@/components/icons";

const SWIPE_THRESHOLD_PX = 40;

export interface LightboxPhoto {
  id: string;
  src: string;
}

// 썸네일 클릭 시 뜨는 전체화면 라이트박스 — 좌우 화살표/스와이프로 넘기고,
// 다운로드·(관리 권한이면) 삭제 버튼을 제공한다.
export function PhotoLightbox({
  photos,
  index,
  dateLabel,
  canManage,
  onClose,
  onIndexChange,
  onDelete,
}: {
  photos: LightboxPhoto[];
  index: number;
  dateLabel: string;
  canManage: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onDelete: (photoId: string) => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const photo = photos[index];
  const total = photos.length;

  function goTo(i: number) {
    onIndexChange(Math.max(0, Math.min(total - 1, i)));
  }
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta > SWIPE_THRESHOLD_PX) goTo(index - 1);
    else if (delta < -SWIPE_THRESHOLD_PX) goTo(index + 1);
  }

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={`${dateLabel} 사진 ${index + 1}/${total}`}
      onClick={onClose}
    >
      <div className="flex items-center justify-between p-4">
        <span className="text-sm font-medium text-white/80">
          {dateLabel} · {index + 1}/{total}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={photo.src}
            download={`teddi-b-${dateLabel}-${index + 1}.jpg`}
            onClick={(e) => e.stopPropagation()}
            className="btn-press touch-target flex h-9 items-center gap-1 rounded-full bg-white/15 px-3 text-xs font-medium text-white"
          >
            📥 다운로드
          </a>
          {canManage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(photo.id);
              }}
              aria-label="사진 삭제"
              className="btn-press touch-target flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="btn-press touch-target flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {index > 0 && (
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="이전 사진"
            className="btn-press touch-target absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl leading-none text-white"
          >
            ‹
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        {index < total - 1 && (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="다음 사진"
            className="btn-press touch-target absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl leading-none text-white"
          >
            ›
          </button>
        )}
      </div>

      {total > 1 && (
        <div className="flex justify-center gap-1.5 p-4">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goTo(i);
              }}
              aria-label={`${i + 1}번째 사진`}
              aria-current={i === index}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
