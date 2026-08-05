import { prisma } from "@/lib/prisma";
import { formatPhone } from "@/lib/phone";
import { approveUserAction, rejectUserAction } from "./actions";

export async function SignupsSection() {
  const pendingUsers = await prisma.user.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">가입 승인 대기 ({pendingUsers.length})</h2>
      {pendingUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground">대기 중인 가입 신청이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {pendingUsers.map((u) => (
            <li
              key={u.id}
              className="surface-card flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{u.name}</p>
                <p className="truncate text-sm text-muted-foreground">{formatPhone(u.phone)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={approveUserAction.bind(null, u.id)}>
                  <button className="btn-press touch-target rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm shadow-primary/25">
                    승인
                  </button>
                </form>
                <form action={rejectUserAction.bind(null, u.id)}>
                  <button className="btn-press touch-target rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground/70">
                    거절
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
