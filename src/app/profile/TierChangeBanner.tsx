"use client";

import { useEffect, useState } from "react";
import { TierBadge } from "@/components/TierBadge";
import { CloseIcon } from "@/components/icons";
import type { TierChange } from "@/lib/tier";
import { markTierSeenAction } from "./actions";

// 마지막으로 확인한 이후 단식/복식 티어가 바뀌었으면 "승급!"/"티어 변동" 카드를
// 보여준다. 방문할 때마다(변화가 없어도) 마운트 시 markTierSeenAction으로
// "확인한 티어"를 지금 티어로 동기화해, 같은 변화를 다시 알리지 않게 한다.
export function TierChangeBanner({
  singlesChange,
  doublesChange,
  currentSinglesKey,
  currentDoublesKey,
}: {
  singlesChange: TierChange | null;
  doublesChange: TierChange | null;
  currentSinglesKey: string;
  currentDoublesKey: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    markTierSeenAction(currentSinglesKey, currentDoublesKey);
    // 마운트 시 한 번만 동기화하면 된다 — 이후 재실행은 불필요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (dismissed || (!singlesChange && !doublesChange)) return null;

  return (
    <div className="surface-card relative space-y-3 p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="닫기"
        className="btn-press touch-target absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
      {singlesChange && <TierChangeRow label="단식" change={singlesChange} />}
      {doublesChange && <TierChangeRow label="복식" change={doublesChange} />}
    </div>
  );
}

function TierChangeRow({ label, change }: { label: string; change: TierChange }) {
  const isUp = change.direction === "UP";
  return (
    <div className="flex flex-wrap items-center gap-2 pr-6 text-sm">
      <span className="font-semibold">{isUp ? "🎉 승급!" : "티어 변동"}</span>
      <span className="text-muted-foreground">{label}</span>
      <TierBadge tier={change.from} size="sm" />
      <span className="text-muted-foreground">→</span>
      <TierBadge tier={change.to} size="sm" />
    </div>
  );
}
