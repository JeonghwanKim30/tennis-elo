"use client";

import { PlayerCombobox } from "@/components/PlayerCombobox";
import { addParticipantAction } from "./actions";

interface Player {
  id: string;
  name: string;
}

export function ParticipantManager({ dayId, players }: { dayId: string; players: Player[] }) {
  if (players.length === 0) {
    return <p className="mt-3 text-xs text-gray-400">추가할 수 있는 활성 회원이 없습니다.</p>;
  }

  return (
    <form action={addParticipantAction.bind(null, dayId)} className="mt-3 flex items-end gap-3">
      <div className="w-56">
        <PlayerCombobox name="userId" players={players} label="참가자 추가" />
      </div>
      <button type="submit" className="rounded bg-primary hover:bg-primary-hover px-3 py-2 text-sm text-white">
        추가
      </button>
    </form>
  );
}
