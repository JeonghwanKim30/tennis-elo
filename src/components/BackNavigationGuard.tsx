"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const EXIT_WINDOW_MS = 2000;

// 뒤로가기를 누르면 이전 화면들을 하나씩 되짚어가는 대신 항상 메인 화면으로 나가고,
// 메인 화면에서는 뒤로가기를 두 번 빠르게 눌러야 앱을 벗어나게 만든다(모바일 앱과 동일한 동작).
// homePath는 로그인 여부에 따라 "/"(로그인 상태) 또는 "/login"(비로그인 상태)이 된다 —
// 비로그인 상태에서 "/"로 보내면 proxy가 다시 "/login"으로 리다이렉트하는 왕복이 생기므로,
// 서버에서 미리 계산해 곧바로 최종 목적지로 보낸다.
export function BackNavigationGuard({ homePath }: { homePath: string }) {
  const router = useRouter();
  const homePathRef = useRef(homePath);
  const wasHomeRef = useRef(false);
  const lastHomeBackAt = useRef(0);
  const [showExitHint, setShowExitHint] = useState(false);

  useEffect(() => {
    homePathRef.current = homePath;
  }, [homePath]);

  useEffect(() => {
    wasHomeRef.current = window.location.pathname === homePath;
    // 앱 진입 시 더미 기록을 하나 쌓아서, 메인 화면에서의 첫 뒤로가기가 곧바로
    // 앱 종료로 이어지지 않고 우리가 가로챌 수 있게 한다.
    window.history.pushState({ guard: true }, "", window.location.href);

    function handlePopState() {
      const wasHome = wasHomeRef.current;
      wasHomeRef.current = window.location.pathname === homePathRef.current;

      if (wasHome) {
        const now = Date.now();
        if (now - lastHomeBackAt.current < EXIT_WINDOW_MS) {
          return;
        }
        lastHomeBackAt.current = now;
        setShowExitHint(true);
        window.history.pushState({ guard: true }, "", window.location.href);
        window.setTimeout(() => setShowExitHint(false), EXIT_WINDOW_MS);
        return;
      }

      if (window.location.pathname !== homePathRef.current) {
        window.history.pushState({ guard: true }, "", window.location.href);
        router.replace(homePathRef.current);
        wasHomeRef.current = true;
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // homePath 변경은 homePathRef를 통해 반영하므로, 리스너를 다시 붙이거나
    // 기록을 다시 쌓을 필요는 없다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (!showExitHint) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-sm text-white shadow-lg">
      뒤로 가기를 한 번 더 누르면 종료됩니다
    </div>
  );
}
