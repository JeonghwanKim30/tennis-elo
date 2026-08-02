"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitMatchAction, type MatchSubmitState } from "./actions";

const initialState: MatchSubmitState = {};

interface Player {
  id: string;
  name: string;
}

export function MatchForm({ players }: { players: Player[] }) {
  const [state, formAction, pending] = useActionState(submitMatchAction, initialState);
  const [type, setType] = useState<"SINGLES" | "DOUBLES">("SINGLES");

  if (state.success) {
    return (
      <p className="rounded bg-green-50 p-4 text-sm text-green-700">
        경기가 등록되었습니다. 다른 회원들도 예정된 경기 목록에서 확인할 수 있습니다.
        관리자가 점수를 입력하면 전적과 ELO에 반영됩니다.{" "}
        <Link href="/matches" className="underline">
          경기 목록 보기
        </Link>
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">경기 종류</label>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as "SINGLES" | "DOUBLES")}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="SINGLES">단식</option>
          <option value="DOUBLES">복식</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">경기 날짜</label>
        <input
          name="playedAt"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>

      <fieldset className="rounded border p-3">
        <legend className="px-1 text-sm font-medium">A팀</legend>
        <PlayerSelect
          name="teamAPlayer1"
          players={players}
          label={type === "DOUBLES" ? "포핸드" : "선수"}
        />
        {type === "DOUBLES" && (
          <PlayerSelect name="teamAPlayer2" players={players} label="백핸드" />
        )}
      </fieldset>

      <fieldset className="rounded border p-3">
        <legend className="px-1 text-sm font-medium">B팀</legend>
        <PlayerSelect
          name="teamBPlayer1"
          players={players}
          label={type === "DOUBLES" ? "포핸드" : "선수"}
        />
        {type === "DOUBLES" && (
          <PlayerSelect name="teamBPlayer2" players={players} label="백핸드" />
        )}
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
      >
        {pending ? "제출 중..." : "경기 등록"}
      </button>
    </form>
  );
}

function PlayerSelect({
  name,
  players,
  label,
}: {
  name: string;
  players: Player[];
  label: string;
}) {
  return (
    <div className="mt-2">
      <label htmlFor={name} className="block text-xs text-gray-500">
        {label}
      </label>
      <select id={name} name={name} required className="mt-1 w-full rounded border px-3 py-2">
        <option value="">선택하세요</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
