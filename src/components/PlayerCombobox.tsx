"use client";

import { useEffect, useRef, useState } from "react";

interface Player {
  id: string;
  name: string;
}

export function PlayerCombobox({
  name,
  players,
  label,
  defaultValue,
}: {
  name: string;
  players: Player[];
  label?: string;
  defaultValue?: string;
}) {
  const defaultPlayer = players.find((p) => p.id === defaultValue);
  const [query, setQuery] = useState(defaultPlayer?.name ?? "");
  const [selectedId, setSelectedId] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query.trim()
    ? players.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : players;

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-xs font-medium text-muted-foreground">{label}</label>}
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedId("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="이름 검색"
        autoComplete="off"
        className="mt-1 w-full rounded-xl border border-border px-4 py-2.5"
      />
      <input type="hidden" name={name} value={selectedId} />
      {open && filtered.length > 0 && (
        <ul className="surface-card absolute z-10 mt-1 max-h-48 w-full overflow-auto p-1.5">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(p.id);
                  setQuery(p.name);
                  setOpen(false);
                }}
                className="btn-press block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
