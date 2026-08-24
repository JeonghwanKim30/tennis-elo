"use client";

import { useState } from "react";
import { getAllTierRanges, type TierKey } from "@/lib/tier";
import { InfoIcon } from "@/components/icons";
import { ModalOverlay } from "@/components/ModalOverlay";
import { ModalHeader } from "@/components/ModalHeader";

export function TierInfoModal({ currentTierKey }: { currentTierKey: TierKey }) {
  const [open, setOpen] = useState(false);
  const ranges = getAllTierRanges();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="티어 안내 보기"
        className="btn-press touch-target flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10"
      >
        <InfoIcon className="h-4 w-4" />
      </button>

      {open && (
        <ModalOverlay onClose={() => setOpen(false)} labelledBy="tier-info-title">
          <ModalHeader
            id="tier-info-title"
            title="TEDDI.B ELO 티어 시스템 안내"
            titleClassName="text-base font-semibold"
            onClose={() => setOpen(false)}
          />

          <ul className="space-y-1.5">
            {ranges.map((r) => {
              const isCurrent = r.tier.key === currentTierKey;
              const rangeLabel =
                r.min === -Infinity
                  ? `${(r.max! + 1).toLocaleString()}점 미만`
                  : r.max === null
                    ? `${r.min.toLocaleString()}점 이상`
                    : `${r.min.toLocaleString()}점 ~ ${r.max.toLocaleString()}점`;
              return (
                <li
                  key={r.tier.key}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    isCurrent ? "bg-primary/10 ring-1 ring-primary" : ""
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: r.tier.color }}
                    />
                    {r.tier.label}
                    {isCurrent && <span className="text-xs font-bold text-primary">(내 티어)</span>}
                  </span>
                  <span className="shrink-0 text-muted-foreground">{rangeLabel}</span>
                </li>
              );
            })}
          </ul>
        </ModalOverlay>
      )}
    </>
  );
}
