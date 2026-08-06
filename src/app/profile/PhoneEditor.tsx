"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PencilIcon, CloseIcon } from "@/components/icons";
import { formatPhone } from "@/lib/phone";
import { updatePhoneAction, type PhoneState } from "./actions";

const initialState: PhoneState = {};
const SUCCESS_AUTOCLOSE_MS = 1200;
const TOAST_DURATION_MS = 4000;

// 전화번호 옆 연필 버튼 -> 모달로 새 번호를 입력받는다. 트리거 버튼은 이름/
// 전화번호 헤더 블록 안에 있을 뿐 <form>에 감싸여 있지 않지만, 다른 페이지의
// 회원가입 모달과 동일하게 안전을 위해 모달 본체는 document.body로 포탈링한다.
export function PhoneEditor({ initialPhone }: { initialPhone: string }) {
  const [displayPhone, setDisplayPhone] = useState(initialPhone);
  const [open, setOpen] = useState(false);
  const [instanceKey, setInstanceKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  function openModal() {
    setInstanceKey((k) => k + 1);
    setOpen(true);
  }
  function closeModal() {
    setOpen(false);
  }

  return (
    <>
      <span className="inline-flex min-w-0 items-center gap-1">
        <span className="truncate">{formatPhone(displayPhone)}</span>
        <button
          type="button"
          onClick={openModal}
          aria-label="전화번호 수정"
          className="btn-press touch-target flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
      </span>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onClick={closeModal}
          >
            <div
              className="surface-card w-full max-w-sm p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="phone-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 id="phone-modal-title" className="text-lg font-semibold">
                  전화번호 변경
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="닫기"
                  className="btn-press touch-target flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <PhoneEditorBody
                key={instanceKey}
                currentPhone={displayPhone}
                onClose={closeModal}
                onSuccess={(newPhone, message) => {
                  setDisplayPhone(newPhone);
                  setToast(message);
                }}
              />
            </div>
          </div>,
          document.body
        )}

      {toast &&
        createPortal(
          <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
            <div className="surface-card border-primary/30 bg-primary/10 px-4 py-3 text-center text-sm font-medium text-primary shadow-lg">
              {toast}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function PhoneEditorBody({
  currentPhone,
  onClose,
  onSuccess,
}: {
  currentPhone: string;
  onClose: () => void;
  onSuccess: (newPhone: string, message: string) => void;
}) {
  const [state, formAction, pending] = useActionState(updatePhoneAction, initialState);

  useEffect(() => {
    if (!state.success || !state.phone) return;
    const timer = setTimeout(() => {
      onClose();
      onSuccess(
        state.phone!,
        "전화번호가 변경되었습니다. 다음 로그인부터는 새 번호 뒷자리 4자리가 PIN입니다."
      );
    }, SUCCESS_AUTOCLOSE_MS);
    return () => clearTimeout(timer);
  }, [state.success, state.phone, onClose, onSuccess]);

  if (state.success) {
    return (
      <div className="space-y-2 py-6 text-center">
        <p className="text-lg font-medium">전화번호가 변경되었습니다.</p>
        <p className="text-sm text-muted-foreground">
          다음 로그인부터는 새 번호의 뒷자리 4자리가 PIN입니다.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="phone-edit-input" className="block text-sm font-medium">
          새 휴대폰 번호
        </label>
        <input
          id="phone-edit-input"
          name="phone"
          type="tel"
          required
          defaultValue={currentPhone}
          placeholder="01012345678"
          className="mt-1 w-full rounded-xl border border-border px-4 py-2.5"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          번호를 변경하면 로그인 PIN도 새 번호의 뒷자리 4자리로 자동 변경됩니다.
        </p>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-press lift-on-hover touch-target w-full rounded-full bg-primary py-3 font-medium text-white shadow-md shadow-primary/25 disabled:opacity-50"
      >
        {pending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
