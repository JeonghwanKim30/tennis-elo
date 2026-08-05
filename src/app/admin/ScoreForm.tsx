"use client";

import { useActionState } from "react";
import { deleteMatchAction, enterMatchScoreAction, type MatchScoreState } from "./actions";

const initialState: MatchScoreState = {};

export function ScoreForm({ matchId }: { matchId: string }) {
  const action = enterMatchScoreAction.bind(null, matchId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={formAction} className="flex items-center gap-2">
        <input
          name="teamAScore"
          type="number"
          min={0}
          required
          placeholder="A"
          className="w-14 rounded-xl border border-border px-2 py-1.5 text-center text-sm"
        />
        <span className="text-sm text-muted-foreground">:</span>
        <input
          name="teamBScore"
          type="number"
          min={0}
          required
          placeholder="B"
          className="w-14 rounded-xl border border-border px-2 py-1.5 text-center text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-press touch-target rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm shadow-primary/25 disabled:opacity-50"
        >
          완료 처리
        </button>
      </form>
      <form action={deleteMatchAction.bind(null, matchId)}>
        <button className="btn-press touch-target rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground/70">
          취소
        </button>
      </form>
      {state.error && <p className="w-full text-xs text-destructive">{state.error}</p>}
    </div>
  );
}
