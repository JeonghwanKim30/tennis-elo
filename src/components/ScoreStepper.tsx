"use client";

import { useState } from "react";

// +/- 버튼(1씩 증감) + 직접 입력이 모두 되는 점수 스핀박스. <form> 안에서
// name이 붙은 일반 number input이라 별도 처리 없이 FormData로 그대로 제출된다.
export function ScoreStepper({
  name,
  defaultValue = 0,
}: {
  name: string;
  defaultValue?: number;
}) {
  const [value, setValue] = useState(defaultValue);

  function clamp(v: number) {
    return Math.max(0, Math.min(99, v));
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setValue((v) => clamp(v - 1))}
        aria-label={`${name === "teamAScore" ? "A팀" : "B팀"} 점수 감소`}
        className="btn-press touch-target flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground/70"
      >
        −
      </button>
      <input
        type="number"
        name={name}
        min={0}
        max={99}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(clamp(Number(e.target.value) || 0))}
        className="w-10 rounded-lg border border-border py-1 text-center text-sm font-semibold"
      />
      <button
        type="button"
        onClick={() => setValue((v) => clamp(v + 1))}
        aria-label={`${name === "teamAScore" ? "A팀" : "B팀"} 점수 증가`}
        className="btn-press touch-target flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground/70"
      >
        +
      </button>
    </div>
  );
}
