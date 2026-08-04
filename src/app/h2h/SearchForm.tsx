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
      <button type="submit" className="rounded bg-primary hover:bg-primary-hover px-4 py-2 text-sm text-white">
        조회
      </button>
    </form>
  );
}
