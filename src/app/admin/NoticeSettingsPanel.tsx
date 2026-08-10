"use client";

import { useActionState, useState, useTransition } from "react";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { TrashIcon } from "@/components/icons";
import {
  addVoteReminderRuleAction,
  broadcastNoticeAction,
  deleteVoteReminderRuleAction,
  setMatchCreatedAlarmAction,
  setMvpAlarmAction,
  setVoteReminderRuleEnabledAction,
  type BroadcastState,
  type VoteReminderRuleState,
} from "./noticeActions";

export interface VoteReminderRuleItem {
  id: string;
  label: string | null;
  dayOffset: number;
  hour: number;
  minute: number;
  enabled: boolean;
}

export interface BroadcastItem {
  id: string;
  message: string;
  recipientCount: number;
  createdAt: string;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = String(Math.floor(i / 2)).padStart(2, "0");
  const minute = i % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

const DAY_OFFSET_OPTIONS = [0, -1, -2, -3, -5, -7];

function dayOffsetLabel(offset: number): string {
  return offset === 0 ? "D-Day 당일" : `D${offset}`;
}

function formatKoreanTime(hour: number, minute: number): string {
  const period = hour < 12 ? "오전" : "오후";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${String(h12).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const broadcastInitialState: BroadcastState = {};
const ruleInitialState: VoteReminderRuleState = {};

export function NoticeSettingsPanel({
  matchCreatedAlarmOn,
  mvpAlarmOn,
  rules: initialRules,
  recentBroadcasts,
}: {
  matchCreatedAlarmOn: boolean;
  mvpAlarmOn: boolean;
  rules: VoteReminderRuleItem[];
  recentBroadcasts: BroadcastItem[];
}) {
  const [matchCreatedOn, setMatchCreatedOn] = useState(matchCreatedAlarmOn);
  const [mvpOn, setMvpOn] = useState(mvpAlarmOn);
  const [rules, setRules] = useState(initialRules);
  const [showAddForm, setShowAddForm] = useState(false);
  const [, startTransition] = useTransition();

  const [broadcastState, broadcastAction, broadcastPending] = useActionState(
    broadcastNoticeAction,
    broadcastInitialState
  );
  const [ruleState, ruleFormAction, rulePending] = useActionState(addVoteReminderRuleAction, ruleInitialState);

  function toggleMatchCreated(next: boolean) {
    setMatchCreatedOn(next);
    startTransition(() => {
      setMatchCreatedAlarmAction(next);
    });
  }

  function toggleMvp(next: boolean) {
    setMvpOn(next);
    startTransition(() => {
      setMvpAlarmAction(next);
    });
  }

  function toggleRule(id: string, next: boolean) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: next } : r)));
    startTransition(() => {
      setVoteReminderRuleEnabledAction(id, next);
    });
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
    startTransition(() => {
      deleteVoteReminderRuleAction(id);
    });
  }

  return (
    <div className="space-y-6">
      {/* 1. 확성기 — 전체 공지 즉시 발송 */}
      <section className="surface-card space-y-3 p-5">
        <h2 className="flex items-center gap-1.5 font-semibold">📢 카카오톡 전체 공지</h2>
        <p className="text-xs text-muted-foreground">
          카카오톡 연동 + 수신 동의된 모든 회원에게 즉시 발송됩니다.
        </p>
        <form action={broadcastAction} className="space-y-2">
          <textarea
            name="message"
            required
            maxLength={500}
            rows={3}
            placeholder="예: 이번 주 토요일 정기 모임은 우천으로 취소되었습니다."
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm"
          />
          {broadcastState.error && <p className="text-xs text-destructive">{broadcastState.error}</p>}
          {broadcastState.success && (
            <p className="text-xs font-medium text-primary">
              {broadcastState.recipientCount}명에게 발송했습니다.
            </p>
          )}
          <button
            type="submit"
            disabled={broadcastPending}
            className="btn-press touch-target w-full rounded-full bg-primary py-2.5 text-sm font-medium text-white shadow-sm shadow-primary/25 disabled:opacity-50"
          >
            {broadcastPending ? "발송 중..." : "전체 알림 발송"}
          </button>
        </form>
        {recentBroadcasts.length > 0 && (
          <ul className="space-y-1 border-t border-border pt-3">
            {recentBroadcasts.map((b) => (
              <li key={b.id} className="truncate text-xs text-muted-foreground">
                {new Date(b.createdAt).toLocaleString("ko-KR")} · {b.recipientCount}명 · {b.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2. 자동 알림 ON/OFF */}
      <section className="surface-card space-y-1 p-5">
        <h2 className="mb-2 font-semibold">자동 알림</h2>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm">경기 등록 알림</span>
          <ToggleSwitch checked={matchCreatedOn} onChange={toggleMatchCreated} label="경기 등록 알림" />
        </div>
        <div className="flex items-center justify-between border-t border-border py-2">
          <span className="text-sm">MVP 선정 알림</span>
          <ToggleSwitch checked={mvpOn} onChange={toggleMvp} label="MVP 선정 알림" />
        </div>
      </section>

      {/* 3. D-DAY 미응답 독촉 알람 — 알람 앱 스타일 */}
      <section className="surface-card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">D-DAY 미응답 독촉 알람</h2>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="btn-press touch-target rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
          >
            + 알람 추가
          </button>
        </div>

        {showAddForm && (
          <form
            action={(formData) => {
              ruleFormAction(formData);
              setShowAddForm(false);
            }}
            className="space-y-2 rounded-xl bg-muted p-3"
          >
            <div className="flex gap-2">
              <select name="dayOffset" defaultValue={-1} className="flex-1 rounded-xl border border-border px-3 py-2 text-sm">
                {DAY_OFFSET_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {dayOffsetLabel(o)}
                  </option>
                ))}
              </select>
              <select name="time" defaultValue="09:00" className="flex-1 rounded-xl border border-border px-3 py-2 text-sm">
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <input
              name="label"
              type="text"
              maxLength={30}
              placeholder="라벨(선택, 예: 마지막 독촉)"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
            {ruleState.error && <p className="text-xs text-destructive">{ruleState.error}</p>}
            <button
              type="submit"
              disabled={rulePending}
              className="btn-press touch-target w-full rounded-full bg-primary py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              추가
            </button>
          </form>
        )}

        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 알람이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {rules.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold">{formatKoreanTime(r.hour, r.minute)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {dayOffsetLabel(r.dayOffset)}
                    {r.label ? ` · ${r.label}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <ToggleSwitch
                    checked={r.enabled}
                    onChange={(next) => toggleRule(r.id, next)}
                    label={`${dayOffsetLabel(r.dayOffset)} 알람 ${r.enabled ? "끄기" : "켜기"}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeRule(r.id)}
                    aria-label="알람 삭제"
                    className="btn-press touch-target flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
