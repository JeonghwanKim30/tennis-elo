"use client";

import { useActionState } from "react";
import { deleteMatchAction, enterMatchScoreAction, type MatchScoreState } from "./actions";

const initialState: MatchScoreState = {};

export function ScoreForm({ matchId }: { matchId: string }) {
  const action = enterMatchScoreAction.bind(null, matchId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={formAction} className="flex items-center gap-2">
        <input
          name="teamAScore"
          type="number"
          min={0}
          required
          placeholder="A"
          className="w-14 rounded border px-2 py-1 text-sm"
        />
        <span className="text-sm text-gray-400">:</span>
        <input
          name="teamBScore"
          type="number"
          min={0}
          required
          placeholder="B"
          className="w-14 rounded border px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-press rounded bg-primary hover:bg-primary-hover px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          완료 처리
        </button>
      </form>
      <form action={deleteMatchAction.bind(null, matchId)}>
        <button className="btn-press rounded bg-gray-200 px-3 py-1 text-sm">취소</button>
      </form>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </div>
  );
}
