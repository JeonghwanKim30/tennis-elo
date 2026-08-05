"use client";

import { useActionState, useState } from "react";
import { PlayerBadge } from "@/components/PlayerBadge";
import type { TeamPlayer } from "@/components/TeamBadges";
import { createMatchInDayAction, type CreateMatchState } from "./actions";

type SlotKey = "teamAPlayer1" | "teamAPlayer2" | "teamBPlayer1" | "teamBPlayer2";
type MatchType = "SINGLES" | "DOUBLES";

const EMPTY_SLOTS: Record<SlotKey, string | null> = {
  teamAPlayer1: null,
  teamAPlayer2: null,
  teamBPlayer1: null,
  teamBPlayer2: null,
};

const initialState: CreateMatchState = {};

export function MatchComposer({
  dayId,
  participants,
}: {
  dayId: string;
  participants: TeamPlayer[];
}) {
  const action = createMatchInDayAction.bind(null, dayId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [type, setType] = useState<MatchType>("SINGLES");
  const [slots, setSlots] = useState<Record<SlotKey, string | null>>(EMPTY_SLOTS);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  const playerById = new Map(participants.map((p) => [p.id, p]));
  const assignedIds = new Set(Object.values(slots).filter((v): v is string => !!v));
  const pool = participants.filter((p) => !assignedIds.has(p.id));

  function placeInSlot(slot: SlotKey, playerId: string) {
    setSlots((prev) => ({ ...prev, [slot]: playerId }));
    setSelectedChip(null);
  }

  function clearSlot(slot: SlotKey) {
    setSlots((prev) => ({ ...prev, [slot]: null }));
  }

  function handleChipClick(playerId: string) {
    setSelectedChip((prev) => (prev === playerId ? null : playerId));
  }

  function handleSlotClick(slot: SlotKey) {
    if (slots[slot]) {
      clearSlot(slot);
    } else if (selectedChip) {
      placeInSlot(slot, selectedChip);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>, slot: SlotKey) {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("text/plain");
    if (playerId) placeInSlot(slot, playerId);
  }

  const requiredSlots: SlotKey[] =
    type === "SINGLES"
      ? ["teamAPlayer1", "teamBPlayer1"]
      : ["teamAPlayer1", "teamAPlayer2", "teamBPlayer1", "teamBPlayer2"];
  const canSubmit = requiredSlots.every((s) => slots[s]);

  return (
    <div className="surface-card space-y-4 p-4">
      <div>
        <label className="block text-sm font-medium">경기 종류</label>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as MatchType);
            setSlots(EMPTY_SLOTS);
          }}
          className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
        >
          <option value="SINGLES">단식</option>
          <option value="DOUBLES">복식</option>
        </select>
      </div>

      <div className={type === "DOUBLES" ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "grid grid-cols-2 gap-4"}>
        <TeamSlots
          label="A팀"
          type={type}
          player1Id={slots.teamAPlayer1}
          player2Id={slots.teamAPlayer2}
          playerById={playerById}
          onDrop={(part, e) => handleDrop(e, part === 1 ? "teamAPlayer1" : "teamAPlayer2")}
          onClickSlot={(part) => handleSlotClick(part === 1 ? "teamAPlayer1" : "teamAPlayer2")}
        />
        <TeamSlots
          label="B팀"
          type={type}
          player1Id={slots.teamBPlayer1}
          player2Id={slots.teamBPlayer2}
          playerById={playerById}
          onDrop={(part, e) => handleDrop(e, part === 1 ? "teamBPlayer1" : "teamBPlayer2")}
          onClickSlot={(part) => handleSlotClick(part === 1 ? "teamBPlayer1" : "teamBPlayer2")}
        />
      </div>

      <div>
        <p className="mb-2 text-xs text-muted-foreground">
          참가자를 슬롯으로 드래그하거나, 선택한 뒤 슬롯을 눌러 배치하세요.
        </p>
        <div className="flex flex-wrap gap-3">
          {pool.map((p) => (
            <button
              key={p.id}
              type="button"
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
              onClick={() => handleChipClick(p.id)}
              className={`btn-press rounded-2xl p-1.5 ${
                selectedChip === p.id ? "bg-accent/30 ring-2 ring-accent" : ""
              }`}
            >
              <PlayerBadge avatarSrc={p.avatarSrc} name={p.name} />
            </button>
          ))}
          {pool.length === 0 && (
            <p className="text-xs text-muted-foreground">모든 참가자가 배치되었습니다.</p>
          )}
        </div>
      </div>

      <form
        action={(formData) => {
          formData.set("type", type);
          formData.set("teamAPlayer1", slots.teamAPlayer1 ?? "");
          formData.set("teamAPlayer2", slots.teamAPlayer2 ?? "");
          formData.set("teamBPlayer1", slots.teamBPlayer1 ?? "");
          formData.set("teamBPlayer2", slots.teamBPlayer2 ?? "");
          return formAction(formData);
        }}
      >
        {state.error && <p className="mb-2 text-sm text-destructive">{state.error}</p>}
        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="btn-press lift-on-hover touch-target w-full rounded-full bg-primary py-3 font-medium text-white shadow-md shadow-primary/25 disabled:opacity-50"
        >
          {pending ? "등록 중..." : "경기 추가"}
        </button>
      </form>
    </div>
  );
}

function TeamSlots({
  label,
  type,
  player1Id,
  player2Id,
  playerById,
  onDrop,
  onClickSlot,
}: {
  label: string;
  type: MatchType;
  player1Id: string | null;
  player2Id: string | null;
  playerById: Map<string, TeamPlayer>;
  onDrop: (part: 1 | 2, e: React.DragEvent<HTMLButtonElement>) => void;
  onClickSlot: (part: 1 | 2) => void;
}) {
  return (
    <fieldset className="rounded-2xl border border-border p-3">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <div className="mt-2 flex justify-center gap-3">
        <Slot
          label={type === "DOUBLES" ? "포핸드" : "선수"}
          player={player1Id ? playerById.get(player1Id) ?? null : null}
          onDrop={(e) => onDrop(1, e)}
          onClick={() => onClickSlot(1)}
        />
        {type === "DOUBLES" && (
          <Slot
            label="백핸드"
            player={player2Id ? playerById.get(player2Id) ?? null : null}
            onDrop={(e) => onDrop(2, e)}
            onClick={() => onClickSlot(2)}
          />
        )}
      </div>
    </fieldset>
  );
}

function Slot({
  label,
  player,
  onDrop,
  onClick,
}: {
  label: string;
  player: TeamPlayer | null;
  onDrop: (e: React.DragEvent<HTMLButtonElement>) => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={player ? `${label} 슬롯: ${player.name} (눌러서 비우기)` : `${label} 슬롯 (비어있음)`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={onClick}
      className="btn-press flex h-20 w-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border text-center hover:border-primary sm:h-24 sm:w-20"
    >
      {player ? (
        <PlayerBadge avatarSrc={player.avatarSrc} name={player.name} />
      ) : (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
    </button>
  );
}
