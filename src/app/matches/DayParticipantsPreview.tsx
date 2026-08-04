"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";

const MAX_VISIBLE = 4;
const LONG_PRESS_MS = 400;

export interface DayParticipant {
  id: string;
  name: string;
  avatarSrc: string;
}

export function DayParticipantsPreview({ participants }: { participants: DayParticipant[] }) {
  const [showPopup, setShowPopup] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);

  if (participants.length === 0) {
    return <p className="text-sm text-gray-500">아직 참가자가 없습니다.</p>;
  }

  const visible = participants.slice(0, MAX_VISIBLE);
  const overflowCount = participants.length - visible.length;
  const namesSummary =
    overflowCount > 0
      ? `${visible.map((p) => p.name).join(", ")} 외 ${overflowCount}명`
      : visible.map((p) => p.name).join(", ");

  function startPress() {
    longPressedRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      setShowPopup(true);
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowPopup(false);
  }

  function handleClickCapture(e: React.MouseEvent) {
    // 길게 눌러 팝업이 떴던 경우, 뒤이어 발생하는 클릭(=상위 링크의 페이지 이동)을 막는다.
    if (longPressedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      longPressedRef.current = false;
    }
  }

  return (
    <div
      className="relative inline-flex select-none items-center gap-2"
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      onClickCapture={handleClickCapture}
    >
      <div className="flex -space-x-2">
        {visible.map((p) => (
          <Avatar key={p.id} src={p.avatarSrc} size="sm" className="ring-2 ring-white" />
        ))}
        {overflowCount > 0 && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-muted text-xs font-medium text-gray-600 ring-2 ring-white">
            +{overflowCount}
          </div>
        )}
      </div>
      <span className="truncate text-sm text-gray-600">{namesSummary}</span>

      {showPopup && (
        <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-lg border bg-white p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-gray-500">
            참가자 {participants.length}명
          </p>
          <ul className="max-h-56 space-y-2 overflow-auto">
            {participants.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <Avatar src={p.avatarSrc} size="sm" />
                <span className="text-sm">{p.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
