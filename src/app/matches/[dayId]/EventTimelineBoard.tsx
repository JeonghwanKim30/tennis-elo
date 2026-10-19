"use client";

import { useMemo, useState, useTransition } from "react";
import { MatchupRow } from "@/components/MatchupRow";
import { PlayerBadge } from "@/components/PlayerBadge";
import { ModalOverlay } from "@/components/ModalOverlay";
import { ModalHeader } from "@/components/ModalHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { playerIdsBusyInSlot, type EventSlot } from "@/lib/eventSchedule";
import type { TeamPlayer } from "@/components/TeamBadges";
import type { MatchType } from "@/generated/prisma/client";
import { placeEventMatchAction, type PlaceEventMatchState } from "./actions";

export interface EventCourtInfo {
  id: string;
  name: string;
}

/** 대진에 배치할 수 있는 사람 — 회원("참여" 응답자)과 이 이벤트의 게스트. */
export interface EventPlayerOption extends TeamPlayer {
  isGuest: boolean;
}

export interface EventPlacedMatch {
  id: string;
  courtId: string | null;
  slotIndex: number | null;
  type: MatchType;
  // 같은 시간대 중복 검증용 원본 id — 서버 액션과 동일한 playerIdsBusyInSlot()에
  // 그대로 넘겨서 화면과 서버의 판정 기준이 어긋나지 않게 한다.
  teamAPlayer1: string;
  teamAPlayer2: string | null;
  teamBPlayer1: string;
  teamBPlayer2: string | null;
  // 표시용(이름/아바타까지 해결된 값)
  teamA1: TeamPlayer;
  teamA2?: TeamPlayer | null;
  teamB1: TeamPlayer;
  teamB2?: TeamPlayer | null;
  /** 결과가 확정된 경기는 대진을 바꿀 수 없다(레이팅 이력과 어긋나므로). */
  isLocked: boolean;
  resultLabel?: string;
  scoreLabel?: string;
}

type SlotKey = "teamAPlayer1" | "teamAPlayer2" | "teamBPlayer1" | "teamBPlayer2";

const EMPTY_SLOTS: Record<SlotKey, string | null> = {
  teamAPlayer1: null,
  teamAPlayer2: null,
  teamBPlayer1: null,
  teamBPlayer2: null,
};

const initialState: PlaceEventMatchState = {};

/**
 * 특수 이벤트의 타임라인 대진표.
 *
 * 행 = 시간대, 열 = 코트. 모바일에서는 3코트 x 4시간대 그리드가 가로로 넘치므로
 * 시간대별 세로 섹션으로 쌓고, sm 이상에서만 실제 그리드로 보여준다.
 */
export function EventTimelineBoard({
  dayId,
  courts,
  slots,
  placed,
  players,
  plannedMatchCount,
  canManage,
  deleteAction,
}: {
  dayId: string;
  courts: EventCourtInfo[];
  slots: EventSlot[];
  placed: EventPlacedMatch[];
  players: EventPlayerOption[];
  plannedMatchCount: number;
  canManage: boolean;
  deleteAction: (matchId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<{ slotIndex: number; court: EventCourtInfo } | null>(null);

  // (slotIndex, courtId) -> 배치된 경기. 셀마다 배열을 훑지 않도록 한 번만 만든다.
  const byCell = useMemo(() => {
    const map = new Map<string, EventPlacedMatch>();
    for (const m of placed) {
      if (m.slotIndex === null || !m.courtId) continue;
      map.set(`${m.slotIndex}:${m.courtId}`, m);
    }
    return map;
  }, [placed]);

  const placedCount = placed.filter((m) => m.slotIndex !== null && m.courtId).length;
  const editingMatch = editing ? byCell.get(`${editing.slotIndex}:${editing.court.id}`) ?? null : null;

  if (slots.length === 0 || courts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        진행 시간·총 경기 수·코트가 설정되지 않아 타임라인을 만들 수 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">타임라인 대진표</h2>
        <span className="shrink-0 rounded-full bg-amber-200/70 px-2.5 py-1 text-xs font-bold text-amber-900">
          배치 {placedCount} / {plannedMatchCount}
        </span>
      </div>

      {/* 데스크톱: 시간 축(왼쪽) + 코트별 열 */}
      <div className="hidden sm:block">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `5.5rem repeat(${courts.length}, minmax(0, 1fr))` }}
        >
          <div className="pb-1 text-center text-xs font-semibold text-muted-foreground">라운드</div>
          {courts.map((c) => (
            <div key={c.id} className="px-1 pb-1 text-center text-sm font-semibold">
              {c.name}
            </div>
          ))}
          {slots.map((slot) => (
            <TimelineRow
              key={slot.index}
              slot={slot}
              courts={courts}
              byCell={byCell}
              canManage={canManage}
              onEdit={(court) => setEditing({ slotIndex: slot.index, court })}
            />
          ))}
        </div>
      </div>

      {/* 모바일: 시간대별로 코트 카드를 세로로 쌓는다 */}
      <div className="space-y-4 sm:hidden">
        {slots.map((slot) => (
          <div key={slot.index}>
            <div className="mb-2 flex items-center gap-2 border-b border-amber-200/70 pb-1.5">
              <span className="shrink-0 rounded-full bg-amber-200/70 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                {slot.roundLabel}
              </span>
              {slot.startLabel && <span className="text-sm font-semibold">{slot.rangeLabel}</span>}
            </div>
            <div className="space-y-2">
              {courts.map((court) => (
                <TimelineCell
                  key={court.id}
                  courtName={court.name}
                  match={byCell.get(`${slot.index}:${court.id}`) ?? null}
                  roundShortLabel={slot.roundShortLabel}
                  canManage={canManage}
                  onEdit={() => setEditing({ slotIndex: slot.index, court })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <PlacementModal
          dayId={dayId}
          slot={slots[editing.slotIndex]}
          court={editing.court}
          existing={editingMatch}
          placed={placed}
          players={players}
          deleteAction={deleteAction}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function TimelineRow({
  slot,
  courts,
  byCell,
  canManage,
  onEdit,
}: {
  slot: EventSlot;
  courts: EventCourtInfo[];
  byCell: Map<string, EventPlacedMatch>;
  canManage: boolean;
  onEdit: (court: EventCourtInfo) => void;
}) {
  return (
    <>
      {/* 시간 축 칸 — 라운드 번호를 뱃지로 먼저 보여주고 그 아래 시간대를 적는다. */}
      <div className="flex flex-col items-end justify-center gap-1 pr-1">
        <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[11px] font-bold text-amber-900">
          {slot.roundLabel}
        </span>
        {slot.startLabel && (
          <span className="text-[11px] font-medium text-muted-foreground">{slot.rangeLabel}</span>
        )}
      </div>
      {courts.map((court) => (
        <TimelineCell
          key={court.id}
          match={byCell.get(`${slot.index}:${court.id}`) ?? null}
          roundShortLabel={slot.roundShortLabel}
          canManage={canManage}
          onEdit={() => onEdit(court)}
        />
      ))}
    </>
  );
}

function TimelineCell({
  courtName,
  match,
  roundShortLabel,
  canManage,
  onEdit,
}: {
  courtName?: string;
  match: EventPlacedMatch | null;
  /** "R1" — 어느 라운드의 경기인지 카드 안에서도 바로 보이게 한다. */
  roundShortLabel: string;
  canManage: boolean;
  onEdit: () => void;
}) {
  if (!match) {
    if (!canManage) {
      return (
        <div className="flex min-h-[4.5rem] items-center justify-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
          {courtName ? `${courtName} · 미정` : "미정"}
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={onEdit}
        className="btn-press flex min-h-[4.5rem] w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary"
      >
        {courtName ? `${courtName} · + 대진 배치` : "+ 대진 배치"}
      </button>
    );
  }

  const body = (
    <>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 rounded-md bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
            {roundShortLabel}
          </span>
          <span className="truncate text-[11px] font-medium text-muted-foreground">
            {courtName ? `${courtName} · ` : ""}
            {match.type === "SINGLES" ? "단식" : "복식"}
          </span>
        </span>
        {match.isLocked && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            결과 확정
          </span>
        )}
      </div>
      <MatchupRow
        type={match.type}
        teamA1={match.teamA1}
        teamA2={match.teamA2}
        teamB1={match.teamB1}
        teamB2={match.teamB2}
        resultLabel={match.resultLabel}
        scoreLabel={match.scoreLabel}
      />
    </>
  );

  if (!canManage || match.isLocked) {
    return <div className="surface-card min-h-[4.5rem] px-3 py-2.5">{body}</div>;
  }
  return (
    <button
      type="button"
      onClick={onEdit}
      className="surface-card btn-press min-h-[4.5rem] w-full cursor-pointer px-3 py-2.5 text-left hover:border-primary"
    >
      {body}
    </button>
  );
}

/** 한 칸(코트 x 시간대)의 대진을 직접 배치하는 모달. */
function PlacementModal({
  dayId,
  slot,
  court,
  existing,
  placed,
  players,
  deleteAction,
  onClose,
}: {
  dayId: string;
  slot: EventSlot;
  court: EventCourtInfo;
  existing: EventPlacedMatch | null;
  placed: EventPlacedMatch[];
  players: EventPlayerOption[];
  deleteAction: (matchId: string) => Promise<void>;
  onClose: () => void;
}) {
  // useActionState 대신 직접 호출하는 이유: 저장에 성공하면 모달을 닫아야 하는데,
  // 반환된 state를 보고 닫으려면 effect에서 부모 setState를 호출하게 되고
  // (react-hooks/set-state-in-effect) 한 박자 늦게 닫혀 깜빡인다.
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<MatchType>(existing?.type ?? "DOUBLES");
  const [slots, setSlots] = useState<Record<SlotKey, string | null>>(() =>
    existing
      ? {
          teamAPlayer1: existing.teamAPlayer1,
          teamAPlayer2: existing.teamAPlayer2,
          teamBPlayer1: existing.teamBPlayer1,
          teamBPlayer2: existing.teamBPlayer2,
        }
      : EMPTY_SLOTS
  );
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [, startTransition] = useTransition();

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  // 같은 시간대에 다른 코트로 이미 배정된 사람 — 선택 자체를 막는다. 편집 중인
  // 경기는 제외해야 자기가 넣어둔 선수를 그대로 둘 수 있다.
  const busyIds = useMemo(
    () => playerIdsBusyInSlot(placed, slot.index, existing?.id),
    [placed, slot.index, existing?.id]
  );

  const assignedIds = new Set(Object.values(slots).filter((v): v is string => !!v));
  const requiredSlots: SlotKey[] =
    type === "SINGLES" ? ["teamAPlayer1", "teamBPlayer1"] : ["teamAPlayer1", "teamAPlayer2", "teamBPlayer1", "teamBPlayer2"];
  const canSubmit = requiredSlots.every((s) => slots[s]);

  function handleSlotClick(key: SlotKey) {
    if (slots[key]) {
      setSlots((prev) => ({ ...prev, [key]: null }));
      return;
    }
    if (selectedChip) {
      setSlots((prev) => ({ ...prev, [key]: selectedChip }));
      setSelectedChip(null);
    }
  }

  function handleDelete() {
    if (!existing) return;
    setConfirmingDelete(false);
    startTransition(async () => {
      await deleteAction(existing.id);
      onClose();
    });
  }

  async function handleSubmit() {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("type", type);
    formData.set("courtId", court.id);
    formData.set("slotIndex", String(slot.index));
    if (existing) formData.set("matchId", existing.id);
    formData.set("teamAPlayer1", slots.teamAPlayer1 ?? "");
    formData.set("teamAPlayer2", type === "DOUBLES" ? slots.teamAPlayer2 ?? "" : "");
    formData.set("teamBPlayer1", slots.teamBPlayer1 ?? "");
    formData.set("teamBPlayer2", type === "DOUBLES" ? slots.teamBPlayer2 ?? "" : "");

    const result = await placeEventMatchAction(dayId, initialState, formData);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    onClose();
  }

  return (
    <ModalOverlay
      onClose={onClose}
      labelledBy="placement-title"
      panelClassName="surface-card flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto p-5"
    >
      <ModalHeader
        id="placement-title"
        title={`[${slot.roundLabel}] ${court.name} · ${slot.rangeLabel}`}
        onClose={onClose}
      />

      <div className="space-y-4">
        <div className="flex gap-1.5">
          <TypePill label="복식" value="DOUBLES" current={type} onSelect={setType} />
          <TypePill label="단식" value="SINGLES" current={type} onSelect={setType} />
        </div>

        <div className={type === "DOUBLES" ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-3"}>
          <TeamSlots
            label="A팀"
            type={type}
            slot1Key="teamAPlayer1"
            slot2Key="teamAPlayer2"
            slots={slots}
            playerById={playerById}
            onSlotClick={handleSlotClick}
          />
          <TeamSlots
            label="B팀"
            type={type}
            slot1Key="teamBPlayer1"
            slot2Key="teamBPlayer2"
            slots={slots}
            playerById={playerById}
            onSlotClick={handleSlotClick}
          />
        </div>

        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            참가자를 선택한 뒤 팀 자리를 누르세요. 같은 시간대 다른 코트에 이미 배정된 사람은 선택할 수 없습니다.
          </p>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => {
              const isBusy = busyIds.has(p.id);
              const isAssigned = assignedIds.has(p.id);
              const disabled = isBusy || isAssigned;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedChip((prev) => (prev === p.id ? null : p.id))}
                  title={isBusy ? `${slot.rangeLabel}에 이미 배정됨` : undefined}
                  className={`btn-press relative rounded-2xl p-1.5 ${
                    selectedChip === p.id ? "bg-accent/30 ring-2 ring-accent" : ""
                  } ${disabled ? "cursor-not-allowed opacity-35" : ""}`}
                >
                  <PlayerBadge avatarSrc={p.avatarSrc} name={p.name} />
                  {p.isGuest && (
                    <span className="absolute -top-0.5 -right-0.5 rounded-full bg-amber-300 px-1 text-[9px] font-bold text-amber-900">
                      G
                    </span>
                  )}
                </button>
              );
            })}
            {players.length === 0 && (
              <p className="text-xs text-muted-foreground">
                &ldquo;참여&rdquo;로 응답한 회원이나 게스트가 없습니다.
              </p>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          {existing && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="btn-press touch-target mr-auto rounded-full bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive"
            >
              비우기
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn-press touch-target rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground/70"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !canSubmit}
            className="btn-press touch-target rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-md shadow-primary/25 disabled:opacity-50"
          >
            {pending ? "저장 중..." : existing ? "대진 수정" : "대진 배치"}
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="이 칸을 비울까요?"
          description={`${court.name} ${slot.rangeLabel} 경기를 삭제합니다.`}
          confirmLabel="비우기"
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </ModalOverlay>
  );
}

function TypePill({
  label,
  value,
  current,
  onSelect,
}: {
  label: string;
  value: MatchType;
  current: MatchType;
  onSelect: (type: MatchType) => void;
}) {
  const isActive = value === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`tab-pill btn-press touch-target flex-1 rounded-full py-1.5 text-sm font-medium ${
        isActive ? "bg-primary text-white shadow-sm shadow-primary/30" : "bg-muted text-foreground/70"
      }`}
    >
      {label}
    </button>
  );
}

function TeamSlots({
  label,
  type,
  slot1Key,
  slot2Key,
  slots,
  playerById,
  onSlotClick,
}: {
  label: string;
  type: MatchType;
  slot1Key: SlotKey;
  slot2Key: SlotKey;
  slots: Record<SlotKey, string | null>;
  playerById: Map<string, EventPlayerOption>;
  onSlotClick: (key: SlotKey) => void;
}) {
  return (
    <fieldset className="rounded-2xl border border-border p-2">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <div className="mt-1 flex justify-center gap-2">
        <Slot
          label={type === "DOUBLES" ? "포핸드" : "선수"}
          player={slots[slot1Key] ? playerById.get(slots[slot1Key]!) ?? null : null}
          onClick={() => onSlotClick(slot1Key)}
        />
        {type === "DOUBLES" && (
          <Slot
            label="백핸드"
            player={slots[slot2Key] ? playerById.get(slots[slot2Key]!) ?? null : null}
            onClick={() => onSlotClick(slot2Key)}
          />
        )}
      </div>
    </fieldset>
  );
}

function Slot({
  label,
  player,
  onClick,
}: {
  label: string;
  player: EventPlayerOption | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={player ? `${label}: ${player.name} (눌러서 비우기)` : `${label} (비어있음)`}
      className="btn-press flex h-20 w-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border text-center hover:border-primary"
    >
      {player ? (
        <PlayerBadge avatarSrc={player.avatarSrc} name={player.name} />
      ) : (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
    </button>
  );
}
