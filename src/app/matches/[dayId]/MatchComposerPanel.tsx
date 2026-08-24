"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { TeamPlayer } from "@/components/TeamBadges";
import { useIdlePreload } from "@/lib/useIdlePreload";

// 드래그 앤 드롭 팀 편성 로직이 있는 무거운 컴포넌트다. "+"를 눌러 패널을
// 열기 전까지는 대부분의 방문자가 쓰지 않으므로, 이 페이지의 초기 번들에서
// 빼서 실제로 열 때만 내려받게 한다. 다만 아예 클릭 시점까지 기다리면 그때
// 가서야 청크를 내려받으며 첫 클릭이 순간 멈추므로, 페이지가 한가해지는
// 대로(useIdlePreload) 미리 백그라운드로 당겨받아둔다.
const MatchComposer = dynamic(() => import("./MatchComposer").then((m) => m.MatchComposer), {
  ssr: false,
  loading: () => <p className="text-sm text-muted-foreground">불러오는 중...</p>,
});

export function MatchComposerPanel({
  dayId,
  participants,
}: {
  dayId: string;
  participants: TeamPlayer[];
}) {
  const [open, setOpen] = useState(false);
  useIdlePreload(() => import("./MatchComposer"));

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">경기 추가</h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "경기 추가 닫기" : "경기 추가 열기"}
          className="btn-press touch-target flex items-center justify-center rounded-full bg-primary text-xl leading-none text-white shadow-md shadow-primary/25"
        >
          {open ? "×" : "+"}
        </button>
      </div>
      {open ? (
        participants.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            &ldquo;참여&rdquo;를 선택한 회원이 2명 이상이어야 경기를 추가할 수 있습니다.
          </p>
        ) : (
          <MatchComposer dayId={dayId} participants={participants} />
        )
      ) : null}
    </section>
  );
}
