"use client";

import { useState } from "react";
import { RegisterMatchDayForm } from "./RegisterMatchDayForm";
import { RegisterEventDayForm } from "./RegisterEventDayForm";

type DayType = "REGULAR" | "SPECIAL";

// 경기 등록 입구 — [일반 경기] / [특수 이벤트]를 먼저 고르고, 고른 쪽 폼만
// 보여준다. 이벤트 폼은 입력 항목이 훨씬 많아서 항상 펼쳐두면 평소(일반 경기
// 등록)의 화면이 번잡해진다.
export function RegisterDayTypePicker() {
  const [dayType, setDayType] = useState<DayType>("REGULAR");

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <TypeButton
          type="REGULAR"
          current={dayType}
          onSelect={setDayType}
          label="일반 경기"
        />
        <TypeButton
          type="SPECIAL"
          current={dayType}
          onSelect={setDayType}
          label="🎪 특수 이벤트"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {dayType === "REGULAR"
          ? "경기일(날짜·시간·장소)을 등록하면 회원들이 참여/불참을 투표할 수 있습니다."
          : "MT·대회처럼 코트와 시간대를 나눠 진행하는 이벤트입니다. 외부 게스트를 명단에 추가할 수 있습니다."}
      </p>

      {dayType === "REGULAR" ? <RegisterMatchDayForm /> : <RegisterEventDayForm />}
    </div>
  );
}

function TypeButton({
  type,
  current,
  onSelect,
  label,
}: {
  type: DayType;
  current: DayType;
  onSelect: (type: DayType) => void;
  label: string;
}) {
  const isActive = type === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      aria-pressed={isActive}
      className={`tab-pill btn-press touch-target flex-1 rounded-full px-4 py-2 text-sm font-medium ${
        isActive
          ? type === "SPECIAL"
            ? "bg-amber-300 text-amber-900 shadow-sm shadow-amber-300/40"
            : "bg-primary text-white shadow-sm shadow-primary/30"
          : "bg-muted text-foreground/70"
      }`}
    >
      {label}
    </button>
  );
}
