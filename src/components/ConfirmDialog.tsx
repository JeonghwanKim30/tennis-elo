"use client";

import { ModalOverlay } from "./ModalOverlay";

// 삭제/추방처럼 되돌릴 수 없는 동작 전에 뜨는 "제목 + 설명 + 취소/확인"
// 확인 다이얼로그 — 경기 일자 삭제, 회원 추방 등에서 똑같은 마크업이
// 반복되던 것을 하나로 모았다.
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmClassName = "btn-press touch-target rounded-full bg-destructive px-4 py-2 text-sm font-medium text-white",
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmClassName?: string;
}) {
  return (
    <ModalOverlay onClose={onCancel} role="alertdialog" panelClassName="surface-card w-full max-w-sm p-5">
      <p className="mb-1 font-semibold">{title}</p>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-press touch-target rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground/70"
        >
          취소
        </button>
        <button type="button" onClick={onConfirm} className={confirmClassName}>
          {confirmLabel}
        </button>
      </div>
    </ModalOverlay>
  );
}
