"use client";

import { useEffect } from "react";

// requestIdleCallback이 없는 브라우저(Safari 등) 대비 폴백.
// timeout을 반드시 넘긴다 — 안 넘기면 브라우저가 계속 "바쁘다"고 판단하는
// 동안(스크롤/애니메이션이 잦은 페이지, 또는 자동화 도구가 프레임을 계속
// 만들어내는 환경 등) 콜백이 무기한 밀릴 수 있어, 프리로드가 사실상 영영
// 실행되지 않는 경우가 생긴다.
const IDLE_TIMEOUT_MS = 2000;
type IdleCallbackId = number;
function requestIdle(cb: () => void): IdleCallbackId {
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
    .requestIdleCallback;
  if (typeof ric === "function") {
    return ric(cb, { timeout: IDLE_TIMEOUT_MS });
  }
  return window.setTimeout(cb, 1);
}
function cancelIdle(id: IdleCallbackId) {
  const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
  if (typeof cic === "function") {
    cic(id);
    return;
  }
  window.clearTimeout(id);
}

/**
 * next/dynamic으로 분할한 무거운 컴포넌트를, 실제로 열기(첫 클릭) 전에
 * 브라우저가 한가한 시점(requestIdleCallback)에 미리 import()해 청크를
 * 캐시에 당겨받는다. 첫 클릭 때 그제서야 JS 청크를 내려받으면서 화면이
 * 순간 멈추는 "콜드 스타트"를 없애기 위한 용도 — import()는 브라우저의
 * 모듈 캐시에 올라가므로, 이후 dynamic()이 같은 모듈을 다시 요청하면
 * 네트워크 왕복 없이 즉시 재사용된다.
 */
export function useIdlePreload(importFn: () => Promise<unknown>) {
  useEffect(() => {
    const id = requestIdle(() => {
      importFn().catch(() => {
        // 프리로드 실패는 무시한다 — 실제로 클릭했을 때 dynamic()이 다시
        // 시도하므로 기능상 문제는 없고, 그저 미리 당겨받기만 못 한 것뿐이다.
      });
    });
    return () => cancelIdle(id);
    // importFn은 매 렌더 새 함수여도 안전하다 — 마운트 시 1회만 예약하면 되므로 의도적으로 deps를 비워둔다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
