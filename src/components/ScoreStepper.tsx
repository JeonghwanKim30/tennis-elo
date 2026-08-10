"use client";

import { useState } from "react";

// 세로형 일체형 점수판 — 위 [+] / 가운데 [점수] / 아래 [-] 세 칸이 하나로
// 붙어있는 스테퍼. 완료된 경기의 ELO 배지가 있던 자리(팀 바깥쪽)에 들어간다.
// 실제 폼 값은 눈에 안 보이는 number input(hidden)으로 제출한다 — 브라우저
// 기본 스핀 화살표 UI에 기대지 않고 디자인을 완전히 통제하기 위함.
export function ScoreStepper({
  name,
  defaultValue = 0,
}: {
  name: string;
  defaultValue?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const label = name === "teamAScore" ? "A팀" : "B팀";

  function clamp(v: number) {
    return Math.max(0, Math.min(99, v));
  }

  return (
    <div className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-border shadow-sm">
      <button
        type="button"
        onClick={() => setValue((v) => clamp(v + 1))}
        aria-label={`${label} 점수 증가`}
        className="btn-press touch-target flex h-7 w-8 items-center justify-center bg-muted text-sm font-bold text-foreground/70 active:bg-primary/10"
      >
        +
      </button>
      <div className="flex h-11 w-8 items-center justify-center border-y border-border bg-card font-display text-lg font-bold text-primary">
        {value}
      </div>
      <button
        type="button"
        onClick={() => setValue((v) => clamp(v - 1))}
        aria-label={`${label} 점수 감소`}
        className="btn-press touch-target flex h-7 w-8 items-center justify-center bg-muted text-sm font-bold text-foreground/70 active:bg-primary/10"
      >
        −
      </button>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
