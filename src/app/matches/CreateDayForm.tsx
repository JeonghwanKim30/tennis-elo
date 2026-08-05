"use client";

import { useActionState } from "react";
import { createMatchDayAction, type CreateDayState } from "./actions";

const initialState: CreateDayState = {};

export function CreateDayForm() {
  const [state, formAction, pending] = useActionState(createMatchDayAction, initialState);

  return (
    <form action={formAction} className="surface-card flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="block text-xs font-medium text-muted-foreground">날짜</label>
        <input
          name="date"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="mt-1 rounded-xl border border-border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="btn-press lift-on-hover touch-target rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-primary/25 disabled:opacity-50"
      >
        {pending ? "생성 중..." : "+ 경기일 등록"}
      </button>
      {state.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
