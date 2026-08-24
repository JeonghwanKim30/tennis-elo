"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useIdlePreload } from "@/lib/useIdlePreload";

// 리캡 모달은 html-to-image(이미지 캡처 라이브러리)를 물고 있어 꽤 무겁다.
// 프로필을 열어본 사람 대부분은 이 버튼을 누르지 않으므로 초기 번들에서
// 빼서 실제로 열 때만 받게 하고, 페이지가 한가해지는 대로 미리 당겨받아
// 첫 클릭이 청크 다운로드로 멈추지 않게 한다(다른 무거운 패널들과 동일한 패턴).
const RecapModalContent = dynamic(() => import("./RecapModalContent").then((m) => m.RecapModalContent), {
  ssr: false,
});

export function RecapButton() {
  const [open, setOpen] = useState(false);
  useIdlePreload(() => import("./RecapModalContent"));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-press touch-target rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-primary/10 hover:text-primary"
      >
        📊 리캡 카드 만들기
      </button>
      {open && <RecapModalContent onClose={() => setOpen(false)} />}
    </>
  );
}
