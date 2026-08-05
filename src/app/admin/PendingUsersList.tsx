"use client";

import { useState, useTransition } from "react";
import { UserListRow } from "./UserListRow";

const REMOVE_ANIMATION_MS = 200;

export interface PendingUser {
  id: string;
  name: string;
  phone: string;
  avatarSrc: string;
}

export function PendingUsersList({
  users: initialUsers,
  approveAction,
  rejectAction,
}: {
  users: PendingUser[];
  approveAction: (userId: string) => Promise<void>;
  rejectAction: (userId: string) => Promise<void>;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  function handle(userId: string, action: (userId: string) => Promise<void>) {
    // 서버 응답을 기다리지 않고 즉시(애니메이션과 함께) 화면에서 지운다.
    setRemovingIds((prev) => new Set(prev).add(userId));
    startTransition(() => {
      action(userId);
    });
    setTimeout(() => {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }, REMOVE_ANIMATION_MS);
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">가입 승인 대기 ({users.length})</h2>
      <div className="surface-card divide-y divide-border">
        {users.map((u) => (
          <UserListRow
            key={u.id}
            avatarSrc={u.avatarSrc}
            name={u.name}
            phone={u.phone}
            removing={removingIds.has(u.id)}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => handle(u.id, approveAction)}
                  className="btn-press touch-target rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm shadow-primary/25"
                >
                  승인
                </button>
                <button
                  type="button"
                  onClick={() => handle(u.id, rejectAction)}
                  className="btn-press touch-target rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground/70"
                >
                  거절
                </button>
              </>
            }
          />
        ))}
        {users.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            대기 중인 가입 신청이 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}
