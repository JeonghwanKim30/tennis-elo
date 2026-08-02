import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import {
  approveMatchAction,
  approveUserAction,
  rejectMatchAction,
  rejectUserAction,
} from "./actions";

const RESULT_LABEL: Record<string, string> = {
  TEAM_A_WIN: "A팀 승",
  TEAM_B_WIN: "B팀 승",
  DRAW: "무승부",
};

export default async function AdminPage() {
  await requireAdmin();

  const [pendingUsers, pendingMatches] = await Promise.all([
    prisma.user.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.match.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "asc" },
    }),
  ]);

  const playerIds = Array.from(
    new Set(
      pendingMatches.flatMap((m) =>
        [m.teamAPlayer1, m.teamAPlayer2, m.teamBPlayer1, m.teamBPlayer2].filter(
          (id): id is string => !!id
        )
      )
    )
  );
  const players = await prisma.user.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(players.map((p) => [p.id, p.name]));

  return (
    <main className="mx-auto max-w-3xl space-y-10 px-4 py-12">
      <h1 className="text-2xl font-bold">관리자 대시보드</h1>

      <section>
        <h2 className="mb-3 text-lg font-semibold">가입 승인 대기 ({pendingUsers.length})</h2>
        {pendingUsers.length === 0 ? (
          <p className="text-sm text-gray-500">대기 중인 가입 신청이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {pendingUsers.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between rounded border px-4 py-3"
              >
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-gray-500">{formatPhone(u.phone)}</p>
                </div>
                <div className="flex gap-2">
                  <form action={approveUserAction.bind(null, u.id)}>
                    <button className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
                      승인
                    </button>
                  </form>
                  <form action={rejectUserAction.bind(null, u.id)}>
                    <button className="rounded bg-gray-200 px-3 py-1 text-sm">거절</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">경기 승인 대기 ({pendingMatches.length})</h2>
        {pendingMatches.length === 0 ? (
          <p className="text-sm text-gray-500">대기 중인 경기가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {pendingMatches.map((m) => {
              const teamA = [m.teamAPlayer1, m.teamAPlayer2]
                .filter((id): id is string => !!id)
                .map((id) => nameById.get(id) ?? "?")
                .join(" / ");
              const teamB = [m.teamBPlayer1, m.teamBPlayer2]
                .filter((id): id is string => !!id)
                .map((id) => nameById.get(id) ?? "?")
                .join(" / ");
              return (
                <li key={m.id} className="rounded border px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        {m.type === "SINGLES" ? "단식" : "복식"} ·{" "}
                        {m.playedAt.toISOString().slice(0, 10)}
                      </p>
                      <p className="font-medium">
                        {teamA} vs {teamB} — {RESULT_LABEL[m.result]}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action={approveMatchAction.bind(null, m.id)}>
                        <button className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
                          승인
                        </button>
                      </form>
                      <form action={rejectMatchAction.bind(null, m.id)}>
                        <button className="rounded bg-gray-200 px-3 py-1 text-sm">거절</button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
