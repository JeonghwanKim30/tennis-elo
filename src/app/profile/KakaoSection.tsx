"use client";

import { useEffect, useState, useTransition } from "react";
import { KakaoTalkIcon } from "@/components/icons";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { disconnectKakaoAction, setKakaoNotifyOptInAction } from "./kakaoActions";

const FEEDBACK_MESSAGES: Record<string, string> = {
  connected: "카카오톡 계정이 연동되었습니다.",
  cancelled: "카카오톡 연동이 취소되었습니다.",
  already_linked: "이미 다른 계정에 연동된 카카오 계정입니다.",
  not_configured: "관리자가 아직 카카오 연동을 설정하지 않았습니다.",
  error: "카카오 연동 중 오류가 발생했습니다. 다시 시도해주세요.",
};

const TOAST_DURATION_MS = 4000;

export function KakaoSection({
  connected,
  nickname,
  notifyOptIn,
  authorizeUrl,
  feedback,
}: {
  connected: boolean;
  nickname: string | null;
  notifyOptIn: boolean;
  authorizeUrl: string | null;
  /** ?kakao=connected 등 OAuth 콜백 리다이렉트 직후 뜨는 안내 문구의 키. */
  feedback?: string;
}) {
  const [optIn, setOptIn] = useState(notifyOptIn);
  const [isConnected, setIsConnected] = useState(connected);
  const [toast, setToast] = useState<string | null>(
    feedback ? (FEEDBACK_MESSAGES[feedback] ?? null) : null
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleToggle(next: boolean) {
    setOptIn(next);
    startTransition(() => {
      setKakaoNotifyOptInAction(next);
    });
  }

  function handleDisconnect() {
    setIsConnected(false);
    setOptIn(false);
    startTransition(() => {
      disconnectKakaoAction();
    });
  }

  return (
    <div className="surface-card space-y-3 p-5">
      <div className="flex items-center gap-2">
        <KakaoTalkIcon className="h-5 w-5 text-[#3C1E1E]" />
        <h2 className="font-semibold">카카오톡 알림</h2>
      </div>

      {!isConnected ? (
        authorizeUrl ? (
          <a
            href={authorizeUrl}
            className="btn-press touch-target flex w-full items-center justify-center gap-2 rounded-full bg-[#FEE500] py-3 text-sm font-semibold text-[#3C1E1E] shadow-sm"
          >
            <KakaoTalkIcon className="h-4 w-4" />
            카카오톡 계정 연동하기
          </a>
        ) : (
          <p className="rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground">
            관리자가 아직 카카오 연동을 설정하지 않았습니다.
          </p>
        )
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {nickname ? `${nickname} 계정으로 연동됨` : "연동됨"}
          </p>
          <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
            <span className="text-sm font-medium">카카오톡 알림 수신 동의</span>
            <ToggleSwitch checked={optIn} onChange={handleToggle} label="카카오톡 알림 수신 동의" />
          </div>
          <button
            type="button"
            onClick={handleDisconnect}
            className="btn-press touch-target w-full rounded-full bg-muted py-2.5 text-xs font-medium text-muted-foreground"
          >
            연동 해제
          </button>
        </>
      )}

      {toast && (
        <div className="rounded-xl bg-primary/10 px-4 py-2.5 text-center text-xs font-medium text-primary">
          {toast}
        </div>
      )}
    </div>
  );
}
