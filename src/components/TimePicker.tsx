"use client";

import { useState } from "react";

// 분은 5분 단위(00, 05, ... 55)까지 고를 수 있게 한다 — 30분 단위로는
// "19시 20분" 같은 실제 코트 예약 시간을 표현할 수 없었다.
export const MINUTE_STEP = 5;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);

const pad = (n: number) => String(n).padStart(2, "0");

/** "19:20" -> { hour: 19, minute: 20 }. 형식이 어긋나면 null. */
function splitTime(value: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/**
 * 시(0~23) + 분(5분 단위) 2단 선택 컴포넌트.
 *
 * 값은 항상 "HH:MM" 한 덩어리로 다루고(서버/스키마가 그 형식을 쓴다), 화면에서만
 * 시/분을 나눠 고른다. 네이티브 <input type="time">을 쓰지 않는 이유는 브라우저마다
 * 모양과 분 단위 스텝 동작이 제각각이라, 이 앱의 다른 셀렉터와 톤이 어긋나고
 * 모바일에서 5분 단위를 강제하기도 어렵기 때문이다.
 *
 * allowEmpty를 켜면 "미정"을 고를 수 있고, 그때 hidden input은 빈 문자열을 보낸다.
 */
export function TimePicker({
  name,
  defaultValue = "",
  allowEmpty = false,
  emptyLabel = "시간 미정",
  ariaLabel,
  onChange,
}: {
  name: string;
  /** "HH:MM" 또는 빈 문자열 */
  defaultValue?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  ariaLabel?: string;
  onChange?: (value: string) => void;
}) {
  const parsed = splitTime(defaultValue);
  const [enabled, setEnabled] = useState(!!parsed);
  const [hour, setHour] = useState(parsed?.hour ?? 19);
  const [minute, setMinute] = useState(
    // 5분 단위에 맞지 않는 기존 값(예: 19:07)이 들어와도 가장 가까운 아래 칸으로 맞춘다.
    parsed ? Math.floor(parsed.minute / MINUTE_STEP) * MINUTE_STEP : 0
  );

  const value = enabled ? `${pad(hour)}:${pad(minute)}` : "";

  function update(next: { hour?: number; minute?: number; enabled?: boolean }) {
    const nextEnabled = next.enabled ?? enabled;
    const nextHour = next.hour ?? hour;
    const nextMinute = next.minute ?? minute;
    if (next.enabled !== undefined) setEnabled(next.enabled);
    if (next.hour !== undefined) setHour(next.hour);
    if (next.minute !== undefined) setMinute(next.minute);
    onChange?.(nextEnabled ? `${pad(nextHour)}:${pad(nextMinute)}` : "");
  }

  const selectClass =
    "w-0 min-w-0 flex-1 appearance-none rounded-xl border border-border bg-white px-2 py-2 text-sm";

  return (
    <div className="mt-1 flex items-center gap-1">
      {/* 폼 제출 시에는 "HH:MM" 한 값만 넘어가게 한다. */}
      <input type="hidden" name={name} value={value} />

      {allowEmpty && (
        <select
          value={enabled ? "set" : "none"}
          onChange={(e) => update({ enabled: e.target.value === "set" })}
          aria-label={ariaLabel ? `${ariaLabel} 사용 여부` : "시간 지정 여부"}
          className={selectClass}
        >
          <option value="none">{emptyLabel}</option>
          <option value="set">시간 지정</option>
        </select>
      )}

      {(!allowEmpty || enabled) && (
        <>
          <select
            value={hour}
            onChange={(e) => update({ hour: Number(e.target.value) })}
            aria-label={ariaLabel ? `${ariaLabel} 시` : "시"}
            className={selectClass}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {pad(h)}시
              </option>
            ))}
          </select>
          <span className="shrink-0 text-xs text-muted-foreground">:</span>
          <select
            value={minute}
            onChange={(e) => update({ minute: Number(e.target.value) })}
            aria-label={ariaLabel ? `${ariaLabel} 분` : "분"}
            className={selectClass}
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {pad(m)}분
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
