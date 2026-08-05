"use client";

import { useState } from "react";
import type { TeamPlayer } from "@/components/TeamBadges";
import { MatchComposer } from "./MatchComposer";

export function MatchComposerPanel({
  dayId,
  participants,
}: {
  dayId: string;
  participants: TeamPlayer[];
}) {
  const [open, setOpen] = useState(false);

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
          <p className="text-sm text-muted-foreground">참가자가 2명 이상이어야 경기를 추가할 수 있습니다.</p>
        ) : (
          <MatchComposer dayId={dayId} participants={participants} />
        )
      ) : null}
    </section>
  );
}
