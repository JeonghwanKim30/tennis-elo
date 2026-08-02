import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { RESULT_LABEL, teamLabel } from "@/lib/matchDisplay";
import { approveUserAction, deleteMatchAction, rejectUserAction } from "./actions";
import { ScoreForm } from "./ScoreForm";

export default async function AdminPage() {
  await requireAdmin();

  const [pendingUsers, scheduledMatches, completedMatches] = await Promise.all([
    prisma.user.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.match.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "asc" },
    }),
    prisma.match.findMany({
      where: { status: "APPROVED" },
      orderBy: { approvalSeq: "desc" },
      take: 30,
    }),
  ]);

  const playerIds = Array.from(
    new Set(
      [...scheduledMatches, ...completedMatches].flatMap((m) =>
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
  const name = (id: string | null) => (id ? nameById.get(id) ?? "?" : undefined);

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
        <h2 className="mb-3 text-lg font-semibold">
          예정된 경기 — 점수 입력 ({scheduledMatches.length})
        </h2>
        {scheduledMatches.length === 0 ? (
          <p className="text-sm text-gray-500">점수 입력을 기다리는 경기가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {scheduledMatches.map((m) => (
              <li key={m.id} className="rounded border px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      {m.type === "SINGLES" ? "단식" : "복식"} ·{" "}
                      {m.playedAt.toISOString().slice(0, 10)}
                    </p>
                    <p className="font-medium">
                      {teamLabel(m.type, name(m.teamAPlayer1)!, name(m.teamAPlayer2))} vs{" "}
                      {teamLabel(m.type, name(m.teamBPlayer1)!, name(m.teamBPlayer2))}
                    </p>
                  </div>
                  <ScoreForm matchId={m.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">완료된 경기</h2>
        {completedMatches.length === 0 ? (
          <p className="text-sm text-gray-500">완료된 경기가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {completedMatches.map((m) => (
              <li key={m.id} className="rounded border px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      {m.type === "SINGLES" ? "단식" : "복식"} ·{" "}
                      {m.playedAt.toISOString().slice(0, 10)}
                    </p>
                    <p className="font-medium">
                      {teamLabel(m.type, name(m.teamAPlayer1)!, name(m.teamAPlayer2))} vs{" "}
                      {teamLabel(m.type, name(m.teamBPlayer1)!, name(m.teamBPlayer2))}
                      {" — "}
                      {m.result ? RESULT_LABEL[m.result] : ""}
                      {m.teamAScore !== null && m.teamBScore !== null
                        ? ` (${m.teamAScore}:${m.teamBScore})`
                        : ""}
                    </p>
                  </div>
                  <form action={deleteMatchAction.bind(null, m.id)}>
                    <button className="rounded bg-red-100 px-3 py-1 text-sm text-red-700">
                      삭제
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
