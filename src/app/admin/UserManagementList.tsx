"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { UserListRow } from "./UserListRow";

const REMOVE_ANIMATION_MS = 200;

export interface ManagedUser {
  id: string;
  name: string;
  phone: string;
  role: "USER" | "ADMIN";
  avatarSrc: string;
}

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
            <UserListRow
              key={u.id}
              avatarSrc={u.avatarSrc}
              name={u.name}
              phone={u.phone}
              removing={removingIds.has(u.id)}
              profileHref={`/profile/${u.id}`}
              badges={
                <>
                  {isSelf && <span className="text-xs text-muted-foreground">(나)</span>}
                  {u.role === "ADMIN" && (
                    <span className="rounded-full bg-secondary/30 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                      관리자
                    </span>
                  )}
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    활동중
                  </span>
                </>
              }
              actions={
                !isSelf && (
                  <button
                    type="button"
                    onClick={() => setConfirmTarget(u)}
                    className="btn-press touch-target shrink-0 rounded-full bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive"
                  >
                    추방
                  </button>
                )
              }
            />
          );
        })}
        {users.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">표시할 회원이 없습니다.</p>
        )}
      </div>

      {confirmTarget && (
        <ConfirmDialog
          title={`${confirmTarget.name}님을 추방할까요?`}
          description="추방된 회원은 로그인할 수 없고 목록에서 바로 제외됩니다. 이미 기록된 경기 이력은 그대로 남습니다."
          confirmLabel="추방"
          onCancel={() => setConfirmTarget(null)}
          onConfirm={confirmBan}
        />
      )}
    </section>
  );
}
