"use client";

import { useEffect, useRef } from "react";
import { CloseIcon, TrashIcon } from "@/components/icons";
import { useImageZoomPan } from "@/hooks/useImageZoomPan";

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
  // 훅이 돌려주는 객체를 zoomPan.xxx로 그때그때 꺼내 쓰면(멤버 접근) 이 객체
  // 안에 ref가 섞여 있다는 이유로 린터(react-hooks/refs)가 관련 없는 다른
  // 프로퍼티 접근까지 전부 "렌더 중 ref 접근"으로 오탐한다 — 훅 호출 시점에
  // 곧바로 구조분해해서 일반 변수로 받으면 이 오탐을 피할 수 있다.
  const {
    scale,
    translate,
    isZoomed,
    containerRef,
    imgRef,
    reset: resetZoom,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onTouchStart: onZoomTouchStart,
    onTouchMove: onZoomTouchMove,
    onTouchEnd: onZoomTouchEnd,
  } = useImageZoomPan();
  const photo = photos[index];
  const total = photos.length;

  // index가 어떤 경로로 바뀌든(화살표/스와이프/점 클릭은 물론, 사진 삭제로
  // 부모가 직접 바꾸는 경우까지) 이전 사진의 확대 상태가 다음 사진에 남지 않게 한다.
  useEffect(() => {
    resetZoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function goTo(i: number) {
    onIndexChange(Math.max(0, Math.min(total - 1, i)));
  }
  function handleTouchStart(e: React.TouchEvent) {
    onZoomTouchStart(e);
    // 확대돼 있을 땐 손가락 이동이 "이동(Pan)"이지 "다음 사진 넘기기"가 아니다.
    touchStartX.current = e.touches.length === 1 && scale <= 1 ? e.touches[0].clientX : null;
  }
  function handleTouchMove(e: React.TouchEvent) {
    onZoomTouchMove(e);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    onZoomTouchEnd(e);
    if (touchStartX.current === null || scale > 1) return;
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
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden px-2"
        style={{ touchAction: "none" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
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
        <img
          ref={imgRef}
          src={photo.src}
          alt=""
          draggable={false}
          className="max-h-full max-w-full rounded-lg object-contain select-none"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            cursor: isZoomed ? "grab" : "zoom-in",
          }}
        />
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
