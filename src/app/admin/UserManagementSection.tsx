import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { avatarSrc } from "@/lib/avatar";
import { formatPhone } from "@/lib/phone";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { banUserAction } from "./actions";
import type { UserStatus } from "@/generated/prisma/client";

const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: "활동중",
  PENDING: "승인 대기",
  REJECTED: "거절됨",
  BANNED: "추방됨",
};
const STATUS_BADGE: Record<UserStatus, string> = {
  ACTIVE: "bg-primary/10 text-primary",
  PENDING: "bg-accent/30 text-accent-foreground",
  REJECTED: "bg-muted text-muted-foreground",
  BANNED: "bg-destructive/10 text-destructive",
};

export async function UserManagementSection({ currentAdminId }: { currentAdminId: string }) {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">유저 관리 ({users.length})</h2>
      <div className="surface-card divide-y divide-border">
        {users.map((u) => {
          const isSelf = u.id === currentAdminId;
          const canBan = !isSelf && u.status !== "BANNED";
          return (
            <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar src={avatarSrc(u)} size="sm" />
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
              {canBan && (
                <ConfirmSubmitButton
                  action={banUserAction.bind(null, u.id)}
                  label="추방"
                  confirmTitle={`${u.name}님을 추방할까요?`}
                  confirmDescription="추방된 회원은 로그인할 수 없고 랭킹 등 목록에서 제외됩니다. 이미 기록된 경기 이력은 그대로 남습니다."
                  confirmLabel="추방"
                  className="btn-press touch-target shrink-0 rounded-full bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive"
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
