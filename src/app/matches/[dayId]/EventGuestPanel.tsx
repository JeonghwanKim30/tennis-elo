"use client";

import { useActionState, useState, useTransition } from "react";
import { PlayerBadge } from "@/components/PlayerBadge";
import { ModalOverlay } from "@/components/ModalOverlay";
import { ModalHeader } from "@/components/ModalHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CloseIcon } from "@/components/icons";
import { GUEST_MMR_MAX, GUEST_MMR_MIN } from "@/lib/validation";
import {
  addEventGuestAction,
  deleteEventGuestAction,
  type EventGuestState,
} from "./actions";

export interface EventGuestItem {
  id: string;
  name: string;
  avatarSrc: string;
  genderLabel: string;
  mmr: number;
}

const initialState: EventGuestState = {};

// 특수 이벤트의 외부 게스트 명단. 계정이 없는 사람이라 관리자가 이름/성별/MMR만
// 입력해 당일 명단에 올린다 — 회원 참석 명단(AttendanceCarousel)과 나란히 놓인다.
export function EventGuestPanel({
  dayId,
  guests,
  canManage,
}: {
  dayId: string;
  guests: EventGuestItem[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="surface-card event-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">게스트 ({guests.length})</h2>
        {canManage && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-press touch-target shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-md shadow-primary/25"
          >
            + 게스트 추가
          </button>
        )}
      </div>

      {guests.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          외부 게스트가 없습니다. {canManage ? "[게스트 추가]로 명단에 올릴 수 있습니다." : ""}
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
          {guests.map((g) => (
            <GuestChip key={g.id} guest={g} canManage={canManage} />
          ))}
        </ul>
      )}

      {open && <AddGuestModal dayId={dayId} onClose={() => setOpen(false)} />}
    </section>
  );
}

function GuestChip({ guest, canManage }: { guest: EventGuestItem; canManage: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete() {
    setConfirming(false);
    startTransition(async () => {
      const result = await deleteEventGuestAction(guest.id);
      // 이미 경기에 배정된 게스트는 지울 수 없다 — 이유를 그대로 보여준다.
      if (result.error) setError(result.error);
    });
  }

  return (
    <li className="relative flex flex-col items-center gap-1.5 rounded-2xl p-2">
      <PlayerBadge avatarSrc={guest.avatarSrc} name={guest.name} />
      <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
        게스트 · {guest.mmr}
      </span>
      {canManage && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`${guest.name} 게스트 삭제`}
          className="btn-press absolute top-0 right-0 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:text-gray-600"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      )}
      {confirming && (
        <ConfirmDialog
          title="게스트를 삭제할까요?"
          description={`${guest.name} 게스트를 이 이벤트 명단에서 제외합니다.`}
          confirmLabel="삭제"
          onCancel={() => setConfirming(false)}
          onConfirm={handleDelete}
        />
      )}
      {error && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded-full bg-destructive px-4 py-2 text-left text-sm font-medium text-white shadow-lg"
          >
            {error}
          </button>
        </div>
      )}
    </li>
  );
}

function AddGuestModal({ dayId, onClose }: { dayId: string; onClose: () => void }) {
  const action = addEventGuestAction.bind(null, dayId);
  const [state, formAction, pending] = useActionState(action, initialState);

  // 등록이 끝나면(에러 없이) 모달을 닫는다. 동명 회원 경고는 닫지 않고 보여준다.
  const done = !pending && !state.error && state.warning !== undefined;

  return (
    <ModalOverlay
      onClose={onClose}
      labelledBy="add-guest-title"
      panelClassName="surface-card w-full max-w-sm p-6"
    >
      <ModalHeader id="add-guest-title" title="게스트 추가" onClose={onClose} />

      <form action={formAction} className="space-y-3">
        <div>
          <label className="block text-sm font-medium" htmlFor="guest-name">
            이름
          </label>
          <input
            id="guest-name"
            name="name"
            type="text"
            required
            maxLength={10}
            placeholder="예: 김게스트"
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <span className="block text-sm font-medium">성별</span>
          <div className="mt-1 flex gap-2">
            <label className="btn-press touch-target has-[:checked]:bg-primary has-[:checked]:text-white has-[:checked]:shadow-sm has-[:checked]:shadow-primary/30 flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-muted py-2.5 text-sm font-medium text-foreground/70">
              <input type="radio" name="gender" value="MALE" defaultChecked className="sr-only" />
              남성
            </label>
            <label className="btn-press touch-target has-[:checked]:bg-primary has-[:checked]:text-white has-[:checked]:shadow-sm has-[:checked]:shadow-primary/30 flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-muted py-2.5 text-sm font-medium text-foreground/70">
              <input type="radio" name="gender" value="FEMALE" className="sr-only" />
              여성
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="guest-mmr">
            MMR (추정 실력)
          </label>
          <input
            id="guest-mmr"
            name="mmr"
            type="number"
            required
            min={GUEST_MMR_MIN}
            max={GUEST_MMR_MAX}
            step={10}
            defaultValue={1200}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            회원 기본값은 1200입니다. 대진 밸런스 계산에만 쓰이고 게스트 본인의 레이팅은 기록되지 않습니다.
          </p>
        </div>

        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state.warning && <p className="text-sm text-amber-700">{state.warning}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="btn-press touch-target rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground/70"
          >
            {done ? "닫기" : "취소"}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="btn-press touch-target rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-md shadow-primary/25 disabled:opacity-50"
          >
            {pending ? "추가 중..." : "추가"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}
