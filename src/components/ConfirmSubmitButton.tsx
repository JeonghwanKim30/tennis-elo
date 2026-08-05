"use client";

import { useState } from "react";

// 파괴적인 작업(추방, 삭제 등)을 누르면 곧바로 실행하지 않고 모달로 한 번 더 확인받는다.
// 서버 액션을 그대로 form action에 연결해 자바스크립트 없이도 실제 제출은 일반 폼처럼 동작한다.
export function ConfirmSubmitButton({
  action,
  label,
  confirmTitle,
  confirmDescription,
  confirmLabel = "확인",
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  label: React.ReactNode;
  confirmTitle: string;
  confirmDescription?: string;
  confirmLabel?: string;
  className: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="surface-card w-full max-w-xs p-5"
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 font-semibold">{confirmTitle}</p>
            {confirmDescription && (
              <p className="mb-4 text-sm text-muted-foreground">{confirmDescription}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-press touch-target rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground/70"
              >
                취소
              </button>
              <form action={action}>
                <button
                  type="submit"
                  className="btn-press touch-target rounded-full bg-destructive px-4 py-2 text-sm font-medium text-white"
                >
                  {confirmLabel}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
