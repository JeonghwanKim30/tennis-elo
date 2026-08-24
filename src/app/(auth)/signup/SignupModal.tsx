"use client";

import { useActionState, useEffect, useState } from "react";
import { signupAction, type SignupState } from "./actions";
import { ModalOverlay } from "@/components/ModalOverlay";
import { ModalHeader } from "@/components/ModalHeader";

const initialState: SignupState = {};
// 가입 완료 화면을 잠깐 보여준 뒤 자동으로 모달을 닫고, 로그인 화면 쪽에
// 토스트로 안내 메시지를 넘긴다.
const SUCCESS_AUTOCLOSE_MS = 1400;

// 페이지 이동 없이 로그인 화면 위에 떠서 가입 신청을 받는 모달.
// 실제 폼(useActionState)은 안쪽 SignupModalBody가 갖고 있고, 모달을 열 때마다
// key를 바꿔 그 컴포넌트를 통째로 리마운트시켜 이전 제출 상태가 남지 않게 한다.
export function SignupModal({ onSuccess }: { onSuccess: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [instanceKey, setInstanceKey] = useState(0);

  function openModal() {
    setInstanceKey((k) => k + 1);
    setOpen(true);
  }
  function closeModal() {
    setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={openModal} className="btn-press font-medium text-primary underline">
        회원가입
      </button>
      {/*
        로그인 폼(<form>) 안에서 이 버튼이 쓰이는 경우가 많아, 모달 내용(안에 또
        다른 <form>이 있음)을 그 자리에 그대로 렌더링하면 <form> 안에 <form>이
        중첩되는 잘못된 HTML이 되어 버린다 — 브라우저가 이를 파싱하면서 안쪽
        폼 제출이 바깥 폼과 뒤섞여 조용히 무시되는 문제가 있었다. document.body로
        포탈링해 트리거 위치와 무관하게 항상 최상위에서 독립적으로 렌더링한다.
      */}
      {open && (
        <ModalOverlay onClose={closeModal} labelledBy="signup-modal-title">
          <ModalHeader id="signup-modal-title" title="회원가입" onClose={closeModal} />
          <SignupModalBody key={instanceKey} onClose={closeModal} onSuccess={onSuccess} />
        </ModalOverlay>
      )}
    </>
  );
}

function SignupModalBody({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  useEffect(() => {
    if (!state.success) return;
    const timer = setTimeout(() => {
      onClose();
      onSuccess("가입 신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.");
    }, SUCCESS_AUTOCLOSE_MS);
    return () => clearTimeout(timer);
  }, [state.success, onClose, onSuccess]);

  if (state.success) {
    return (
      <div className="space-y-2 py-6 text-center">
        <p className="text-lg font-medium">가입 신청이 접수되었습니다.</p>
        <p className="text-sm text-muted-foreground">관리자 승인 후 로그인할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="signup-modal-name" className="block text-sm font-medium">
          이름
        </label>
        <input
          id="signup-modal-name"
          name="name"
          type="text"
          required
          maxLength={50}
          className="mt-1 w-full rounded-xl border border-border px-4 py-2.5"
        />
      </div>
      <div>
        <label htmlFor="signup-modal-phone" className="block text-sm font-medium">
          휴대폰 번호
        </label>
        <input
          id="signup-modal-phone"
          name="phone"
          type="tel"
          required
          placeholder="01012345678"
          className="mt-1 w-full rounded-xl border border-border px-4 py-2.5"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          PIN 번호는 휴대폰 번호의 뒷자리 4자리로 자동 설정됩니다.
        </p>
      </div>
      <div>
        <span className="block text-sm font-medium">성별</span>
        <div className="mt-1.5 flex gap-2">
          <label className="btn-press touch-target has-[:checked]:bg-primary has-[:checked]:text-white has-[:checked]:shadow-sm has-[:checked]:shadow-primary/30 flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-muted py-2.5 text-sm font-medium text-foreground/70">
            <input type="radio" name="gender" value="MALE" required defaultChecked className="sr-only" />
            남
          </label>
          <label className="btn-press touch-target has-[:checked]:bg-primary has-[:checked]:text-white has-[:checked]:shadow-sm has-[:checked]:shadow-primary/30 flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-muted py-2.5 text-sm font-medium text-foreground/70">
            <input type="radio" name="gender" value="FEMALE" required className="sr-only" />
            여
          </label>
        </div>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-press lift-on-hover touch-target w-full rounded-full bg-primary py-3 font-medium text-white shadow-md shadow-primary/25 disabled:opacity-50"
      >
        {pending ? "제출 중..." : "가입 신청"}
      </button>
    </form>
  );
}
