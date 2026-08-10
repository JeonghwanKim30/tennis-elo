"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/Avatar";
import { TierBadge } from "@/components/TierBadge";
import type { Tier } from "@/lib/tier";

export function MvpModal({
  dateLabel,
  name,
  avatarSrc,
  tier,
  totalEloGain,
  wins,
  losses,
  autoOpen = false,
}: {
  dateLabel: string;
  name: string;
  avatarSrc: string;
  tier: Tier;
  totalEloGain: number;
  wins: number;
  losses: number;
  /** 카카오톡 MVP 알림의 딥링크(?openMvp=1)로 들어왔을 때 팝업을 바로 열어준다. */
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-press touch-target shrink-0 rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-accent-foreground shadow-sm shadow-primary/20"
      >
        🏆 MVP 보기
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onClick={() => setOpen(false)}
          >
            <div
              className="surface-card w-full max-w-sm p-6 text-center"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mvp-modal-title"
              onClick={(e) => e.stopPropagation()}
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
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
