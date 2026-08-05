"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { formatPhone } from "@/lib/phone";

const REMOVE_ANIMATION_MS = 200;

export interface ManagedUser {
  id: string;
  name: string;
  phone: string;
  role: "USER" | "ADMIN";
  status: "PENDING" | "ACTIVE";
  avatarSrc: string;
}

const STATUS_LABEL: Record<ManagedUser["status"], string> = {
  ACTIVE: "활동중",
  PENDING: "승인 대기",
};
const STATUS_BADGE: Record<ManagedUser["status"], string> = {
  ACTIVE: "bg-primary/10 text-primary",
  PENDING: "bg-accent/30 text-accent-foreground",
};

export function UserManagementList({
  users: initialUsers,
  currentAdminId,
  banAction,
}: {
  users: ManagedUser[];
  currentAdminId: string;
  banAction: (userId: string) => Promise<void>;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [confirmTarget, setConfirmTarget] = useState<ManagedUser | null>(null);
  const [, startTransition] = useTransition();

  function confirmBan() {
    if (!confirmTarget) return;
    const userId = confirmTarget.id;
    setConfirmTarget(null);
    // 서버 응답을 기다리지 않고 즉시(애니메이션과 함께) 화면에서 지운다.
    setRemovingIds((prev) => new Set(prev).add(userId));
    startTransition(() => {
      banAction(userId);
    });
    setTimeout(() => {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }, REMOVE_ANIMATION_MS);
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">유저 관리 ({users.length})</h2>
      <div className="surface-card divide-y divide-border">
        {users.map((u) => {
          const isSelf = u.id === currentAdminId;
          return (
            <div
              key={u.id}
              className={`flex flex-wrap items-center gap-3 px-4 py-3 transition-all duration-200 ease-out ${
                removingIds.has(u.id) ? "-translate-x-2 opacity-0" : "opacity-100"
              }`}
            >
              <Avatar src={u.avatarSrc} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-medium">{u.name}</span>
                  {isSelf && <span className="text-xs text-muted-foreground">(나)</span>}
                  {u.role === "ADMIN" && (
                    <span className="rounded-full bg-secondary/30 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                      관리자
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[u.status]}`}>
                    {STATUS_LABEL[u.status]}
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">{formatPhone(u.phone)}</p>
              </div>
              {!isSelf && (
                <button
                  type="button"
                  onClick={() => setConfirmTarget(u)}
                  className="btn-press touch-target shrink-0 rounded-full bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive"
                >
                  추방
                </button>
              )}
            </div>
          );
        })}
        {users.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">표시할 회원이 없습니다.</p>
        )}
      </div>

      {confirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmTarget(null)}
        >
          <div
            className="surface-card w-full max-w-xs p-5"
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 font-semibold">{confirmTarget.name}님을 추방할까요?</p>
            <p className="mb-4 text-sm text-muted-foreground">
              추방된 회원은 로그인할 수 없고 목록에서 바로 제외됩니다. 이미 기록된 경기 이력은 그대로
              남습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="btn-press touch-target rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground/70"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmBan}
                className="btn-press touch-target rounded-full bg-destructive px-4 py-2 text-sm font-medium text-white"
              >
                추방
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
