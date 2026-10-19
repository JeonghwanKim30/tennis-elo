"use client";

import { useActionState, useState } from "react";
import { kstDateString } from "@/lib/date";
import { MAX_EVENT_COURTS, MAX_EVENT_ROUNDS } from "@/lib/validation";
import { buildEventSlots } from "@/lib/eventSchedule";
import { TimePicker } from "@/components/TimePicker";
import { createEventDayAction, type CreateEventState } from "./actions";

const initialState: CreateEventState = {};

const DEFAULT_COURT_NAMES = ["A코트", "B코트", "C코트", "D코트", "E코트", "F코트", "G코트", "H코트"];

// MT/대회 같은 특수 이벤트 생성 폼. 일반 경기일과 달리 제목·진행 시간·총 경기
// 수·코트 목록을 함께 받고, 입력한 값으로 타임슬롯이 어떻게 나뉘는지 미리
// 보여줘서(아래 안내 문구) 관리자가 저장 전에 확인할 수 있게 한다.
export function RegisterEventDayForm() {
  const [state, formAction, pending] = useActionState(createEventDayAction, initialState);
  const [courtCount, setCourtCount] = useState(3);
  const [courtNames, setCourtNames] = useState<string[]>(() => DEFAULT_COURT_NAMES.slice(0, 3));
  const [startTime, setStartTime] = useState("15:00");
  const [endTime, setEndTime] = useState("19:00");
  // 총 경기 수를 직접 받지 않고 "코트 수 × 라운드 수"로 계산한다 — 직접 입력
  // 방식은 코트 수와 떨어져 있어서, 예를 들어 3코트에 12경기를 넣으면 4라운드가
  // 되는 식으로 관리자가 의도한 라운드 수와 어긋났다.
  const [roundCount, setRoundCount] = useState(3);
  const matchCount = courtCount * roundCount;

  function handleCourtCountChange(next: number) {
    setCourtCount(next);
    setCourtNames((prev) =>
      Array.from({ length: next }, (_, i) => prev[i] ?? DEFAULT_COURT_NAMES[i] ?? `${i + 1}코트`)
    );
  }

  // 저장 전에 "어떻게 나뉘는지"를 그대로 보여준다 — 서버와 동일한 계산 함수를
  // 공유하므로 미리보기와 실제 결과가 어긋날 일이 없다.
  const slots = buildEventSlots({ startTime, endTime, plannedMatchCount: matchCount, courtCount });

  return (
    <form action={formAction} className="surface-card event-card flex w-full flex-col gap-3 p-4">
      <div>
        <label className="block text-xs font-medium text-muted-foreground">이벤트 제목</label>
        <input
          name="title"
          type="text"
          required
          maxLength={40}
          placeholder="예: 2026 가을 테니스 MT"
          className="mt-1 w-full appearance-none rounded-xl border border-border bg-white px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted-foreground">날짜</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={kstDateString()}
            className="mt-1 w-full appearance-none rounded-xl border border-border bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-[2]">
          <label className="block text-xs font-medium text-muted-foreground">장소</label>
          <input
            name="location"
            type="text"
            maxLength={60}
            placeholder="예: 양평 테니스 리조트"
            className="mt-1 w-full appearance-none rounded-xl border border-border bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted-foreground">시작 시간</label>
          <TimePicker
            name="startTime"
            defaultValue={startTime}
            ariaLabel="시작 시간"
            onChange={setStartTime}
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted-foreground">종료 시간</label>
          <TimePicker name="endTime" defaultValue={endTime} ariaLabel="종료 시간" onChange={setEndTime} />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted-foreground">코트 수</label>
          <select
            value={courtCount}
            onChange={(e) => handleCourtCountChange(Number(e.target.value))}
            className="mt-1 w-full appearance-none rounded-xl border border-border bg-white px-3 py-2 text-sm"
          >
            {Array.from({ length: MAX_EVENT_COURTS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}개 코트
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted-foreground">라운드 수</label>
          <select
            value={roundCount}
            onChange={(e) => setRoundCount(Number(e.target.value))}
            className="mt-1 w-full appearance-none rounded-xl border border-border bg-white px-3 py-2 text-sm"
          >
            {Array.from({ length: MAX_EVENT_ROUNDS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}라운드
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <span className="block text-xs font-medium text-muted-foreground">총 경기 수</span>
          {/* 코트 수 x 라운드 수로 자동 계산된다 — 서버에도 이 값을 그대로 보낸다. */}
          <input type="hidden" name="plannedMatchCount" value={matchCount} />
          <p className="mt-1 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-amber-900">
            {courtCount} × {roundCount} = {matchCount}경기
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground">코트 이름</label>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {courtNames.map((name, i) => (
            <input
              key={i}
              name="courtName"
              type="text"
              required
              maxLength={20}
              value={name}
              onChange={(e) =>
                setCourtNames((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
              }
              aria-label={`${i + 1}번째 코트 이름`}
              className="appearance-none rounded-xl border border-border bg-white px-3 py-2 text-sm"
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground">ELO 반영</label>
        <select
          name="eloMode"
          defaultValue="NONE"
          className="mt-1 w-full appearance-none rounded-xl border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="NONE">반영 안 함 (기록만 — MT 기본)</option>
          <option value="MEMBERS_ONLY">회원만 반영 (게스트 MMR은 상대 실력 추정치로만 사용)</option>
        </select>
      </div>

      {slots.length > 0 && (
        <p className="rounded-xl bg-white/70 px-3 py-2 text-xs text-amber-900/80">
          코트 {courtCount}개 × {slots.length}라운드 = 경기 {matchCount}개로 아래 시간대에 생성됩니다 —{" "}
          {slots.map((s) => s.rangeLabel).join(" / ")}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-press lift-on-hover touch-target w-full rounded-full bg-primary py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25 disabled:opacity-50"
      >
        {pending ? "생성 중..." : "+ 특수 이벤트 등록"}
      </button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
