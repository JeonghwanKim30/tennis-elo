"use client";

import { useActionState } from "react";
import { createMatchDayAction, type CreateDayState } from "./actions";

const initialState: CreateDayState = {};

export function CreateDayForm() {
  const [state, formAction, pending] = useActionState(createMatchDayAction, initialState);

  return (
    <form action={formAction} className="flex items-end gap-3 rounded border p-4">
      <div>
        <label className="block text-xs text-gray-500">날짜</label>
        <input
          name="date"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="mt-1 rounded border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "생성 중..." : "+ 경기일 등록"}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
