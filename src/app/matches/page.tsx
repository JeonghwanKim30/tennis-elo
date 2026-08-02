import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RESULT_LABEL, teamLabel } from "@/lib/matchDisplay";

export default async function MatchesPage() {
  const [scheduled, completed] = await Promise.all([
    prisma.match.findMany({
      where: { status: "PENDING" },
      orderBy: { playedAt: "asc" },
    }),
    prisma.match.findMany({
      where: { status: "APPROVED" },
      orderBy: { approvalSeq: "desc" },
      take: 30,
    }),
  ]);

  const playerIds = Array.from(
    new Set(
      [...scheduled, ...completed].flatMap((m) =>
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">경기 목록</h1>
        <Link href="/matches/new" className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
          경기 등록
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">예정된 경기 ({scheduled.length})</h2>
        {scheduled.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 예정 경기가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {scheduled.map((m) => (
              <li key={m.id} className="rounded border px-4 py-3 text-sm">
                <p className="text-gray-500">
                  {m.type === "SINGLES" ? "단식" : "복식"} ·{" "}
                  {m.playedAt.toISOString().slice(0, 10)}
                </p>
                <p className="font-medium">
                  {teamLabel(m.type, name(m.teamAPlayer1)!, name(m.teamAPlayer2))} vs{" "}
                  {teamLabel(m.type, name(m.teamBPlayer1)!, name(m.teamBPlayer2))}
                </p>
                <p className="text-xs text-gray-400">점수 입력 대기 중</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">완료된 경기</h2>
        {completed.length === 0 ? (
          <p className="text-sm text-gray-500">완료된 경기가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {completed.map((m) => (
              <li key={m.id} className="rounded border px-4 py-3 text-sm">
                <p className="text-gray-500">
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
