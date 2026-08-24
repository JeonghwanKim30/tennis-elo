"use client";

import { createPortal } from "react-dom";

// 이 앱 전역에서 반복되던 "배경 딤 + 중앙 정렬 패널 + document.body로
// 포탈링" 모달 뼈대를 하나로 모았다. 트리거 버튼이 <form> 안에 있는
// 경우(회원가입/전화번호 수정 모달 등)에도 안쪽 모달의 <form>이 바깥
// <form>과 중첩되지 않도록 항상 document.body로 포탈링한다 — 개별
// 모달이 포탈이 필요 없어 보이는 경우(확인 다이얼로그 등)에도 똑같이
// 적용해 스태킹 컨텍스트/z-index 문제를 예방한다.
export function ModalOverlay({
  onClose,
  labelledBy,
  role = "dialog",
  panelClassName = "surface-card w-full max-w-sm p-6",
  children,
}: {
  onClose: () => void;
  /** 패널의 aria-labelledby가 가리킬 제목 요소의 id. 확인 다이얼로그처럼
   *  별도 h2가 없으면 생략해도 된다. */
  labelledBy?: string;
  role?: "dialog" | "alertdialog";
  panelClassName?: string;
  children: React.ReactNode;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={panelClassName}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
