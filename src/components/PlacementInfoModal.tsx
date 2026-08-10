"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { InfoIcon } from "@/components/icons";

const PLACEMENT_TOTAL = 5;

// "배치 중" 배지 옆에 붙는 안내 아이콘 — 배치 경기 제도 자체를 설명하고,
// 현재 몇 경기째 진행 중인지 보여준다.
export function PlacementInfoModal({ completed }: { completed: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="배치 경기 안내 보기"
        className="btn-press touch-target flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10"
      >
        <InfoIcon className="h-4 w-4" />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onClick={() => setOpen(false)}
          >
            <div
              className="surface-card w-full max-w-sm p-6 text-center"
              role="dialog"
              aria-modal="true"
              aria-labelledby="placement-info-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="placement-info-title" className="text-base font-semibold">
                배치 경기 안내
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                최초 {PLACEMENT_TOTAL}경기까지는 배치 경기(Placement) 기간입니다.{" "}
                {PLACEMENT_TOTAL}경기를 모두 완료해야 정식 랭킹과 티어가 부여됩니다.
              </p>
              <p className="mt-3 font-display text-2xl font-bold text-primary">
                현재 진행: {completed} / {PLACEMENT_TOTAL}경기
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-press touch-target mt-5 w-full rounded-full bg-primary py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25"
              >
                확인
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
