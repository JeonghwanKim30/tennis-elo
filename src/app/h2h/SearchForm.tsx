"use client";

import { PlayerCombobox } from "@/components/PlayerCombobox";

interface Player {
  id: string;
  name: string;
}

export function SearchForm({ players, defaultValue }: { players: Player[]; defaultValue?: string }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="w-56">
        <PlayerCombobox name="player" players={players} label="선수 검색" defaultValue={defaultValue} />
      </div>
      <button
        type="submit"
        className="btn-press touch-target rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-primary/25"
      >
        조회
      </button>
    </form>
  );
}
