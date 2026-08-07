"use client";

import { useActionState } from "react";
import { createMatchDayAction, type CreateDayState } from "./actions";

const initialState: CreateDayState = {};

// 30분 단위(00/30분)로만 고를 수 있도록 자유 입력 대신 드롭다운 옵션을 만든다.
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = String(Math.floor(i / 2)).padStart(2, "0");
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

export function RegisterMatchDayForm() {
  const [state, formAction, pending] = useActionState(createMatchDayAction, initialState);

  return (
    <form action={formAction} className="surface-card flex w-full max-w-full flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-end">
      <div className="w-full max-w-full md:min-w-[9rem] md:flex-1">
        <label className="block text-xs font-medium text-muted-foreground">날짜</label>
        <input
          name="date"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="mt-1 w-full max-w-full appearance-none rounded-xl border border-border px-3 py-2 text-sm"
        />
      </div>
      <div className="w-full max-w-full md:min-w-[7rem] md:flex-1">
        <label className="block text-xs font-medium text-muted-foreground">시간</label>
        <select
          name="time"
          defaultValue=""
          className="mt-1 w-full max-w-full appearance-none rounded-xl border border-border px-3 py-2 text-sm"
        >
          <option value="">시간 미정</option>
          {TIME_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="w-full max-w-full md:min-w-[9rem] md:flex-[2]">
        <label className="block text-xs font-medium text-muted-foreground">장소</label>
        <input
          name="location"
          type="text"
          placeholder="예: 올림픽공원 테니스장"
          maxLength={100}
          className="mt-1 w-full max-w-full appearance-none rounded-xl border border-border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="btn-press lift-on-hover touch-target w-full max-w-full shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25 disabled:opacity-50 md:w-auto"
      >
        {pending ? "생성 중..." : "+ 경기일 등록"}
      </button>
      {state.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
