"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { TierBadge } from "@/components/TierBadge";
import { ModalOverlay } from "@/components/ModalOverlay";
import type { Tier } from "@/lib/tier";

export function MvpModal({
  dateLabel,
  name,
  avatarSrc,
  tier,
  totalEloGain,
  wins,
  losses,
}: {
  dateLabel: string;
  name: string;
  avatarSrc: string;
  tier: Tier;
  totalEloGain: number;
  wins: number;
  losses: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-press touch-target shrink-0 rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-accent-foreground shadow-sm shadow-primary/20"
      >
        🏆 MVP 보기
      </button>

      {open && (
        <ModalOverlay
          onClose={() => setOpen(false)}
          labelledBy="mvp-modal-title"
          panelClassName="surface-card w-full max-w-sm p-6 text-center"
        >
          <h2 id="mvp-modal-title" className="text-lg font-bold">
            🏆 오늘의 MVP
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>

          <div className="mt-4 flex flex-col items-center gap-2">
            <Avatar src={avatarSrc} size="lg" className="shadow-md shadow-primary/10" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{name}</span>
              <TierBadge tier={tier} size="sm" />
            </div>
          </div>

          <div className="mt-5 flex justify-center gap-6">
            <div>
              <p className="font-display text-3xl font-bold text-primary">+{totalEloGain}</p>
              <p className="text-xs text-muted-foreground">획득 ELO</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold">
                {wins}승 {losses}패
              </p>
              <p className="text-xs text-muted-foreground">당일 전적</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn-press touch-target mt-6 w-full rounded-full bg-primary py-3 font-medium text-white shadow-md shadow-primary/25"
          >
            확인
          </button>
        </ModalOverlay>
      )}
    </>
  );
}
