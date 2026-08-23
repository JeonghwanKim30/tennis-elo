"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { PlayerBadge } from "@/components/PlayerBadge";
import type { ParticipationStatus } from "@/generated/prisma/client";
import { setParticipationStatusAction } from "./actions";

const TOAST_DURATION_MS = 3000;

const RSVP_LABEL: Record<ParticipationStatus, string> = {
  ATTENDING: "참여",
  NOT_ATTENDING: "불참",
  PENDING: "미응답",
};
const RSVP_BADGE: Record<ParticipationStatus, string> = {
  ATTENDING: "bg-primary/10 text-primary",
  NOT_ATTENDING: "bg-destructive/10 text-destructive",
  PENDING: "bg-muted text-muted-foreground",
};

export interface AttendanceMember {
  id: string;
  name: string;
  avatarSrc: string;
  status: ParticipationStatus;
  isSelf: boolean;
  canEdit: boolean;
}

// 참석 여부 그리드(한 캐러셀 페이지 분량) — "참여/불참" 버튼을 누르면 서버
// 응답을 기다리지 않고 useOptimistic으로 즉시 화면부터 바꾼다. 실패하면(권한
// 없음, 네트워크 오류 등) 다음 리렌더에서 실제 값(members prop)으로 자동
// 되돌아가므로 별도 되돌리기 코드 없이 토스트만 띄우면 된다.
export function AttendanceMemberGrid({ dayId, members }: { dayId: string; members: AttendanceMember[] }) {
  const [optimisticMembers, setOptimisticStatus] = useOptimistic(
    members,
    (state, update: { userId: string; status: ParticipationStatus }) =>
      state.map((m) => (m.id === update.userId ? { ...m, status: update.status } : m))
  );
  const [, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleClick(userId: string, status: "ATTENDING" | "NOT_ATTENDING") {
    startTransition(async () => {
      setOptimisticStatus({ userId, status });
      try {
        await setParticipationStatusAction(dayId, userId, status, new FormData());
      } catch {
        setToast("참석 여부 변경에 실패했습니다. 다시 시도해주세요.");
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {optimisticMembers.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col items-center gap-1.5 rounded-2xl p-2 ${
              m.isSelf ? "bg-accent/15 ring-1 ring-accent" : ""
            }`}
          >
            <PlayerBadge avatarSrc={m.avatarSrc} name={m.name} userId={m.id} />
            {m.isSelf && <span className="text-[10px] font-medium text-muted-foreground">나</span>}
            {m.canEdit ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleClick(m.id, "ATTENDING")}
                  className={`btn-press rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    m.status === "ATTENDING" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  참여
                </button>
                <button
                  type="button"
                  onClick={() => handleClick(m.id, "NOT_ATTENDING")}
                  className={`btn-press rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    m.status === "NOT_ATTENDING" ? "bg-destructive text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  불참
                </button>
              </div>
            ) : (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${RSVP_BADGE[m.status]}`}>
                {RSVP_LABEL[m.status]}
              </span>
            )}
          </div>
        ))}
      </div>
      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="rounded-full bg-destructive px-4 py-2 text-sm font-medium text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
