import { prisma } from "@/lib/prisma";
import type { Match } from "@/generated/prisma/client";
import { SearchForm } from "./SearchForm";

type Outcome = "WIN" | "LOSS" | "DRAW";

function teamOf(m: Match, userId: string): "A" | "B" | null {
  if (m.teamAPlayer1 === userId || m.teamAPlayer2 === userId) return "A";
  if (m.teamBPlayer1 === userId || m.teamBPlayer2 === userId) return "B";
  return null;
}

function opponentsOf(m: Match, selfSide: "A" | "B"): string[] {
  const other =
    selfSide === "A"
      ? [m.teamBPlayer1, m.teamBPlayer2]
      : [m.teamAPlayer1, m.teamAPlayer2];
  return other.filter((id): id is string => !!id);
}

function outcomeFor(m: Match, selfSide: "A" | "B"): Outcome {
  if (m.result === "DRAW") return "DRAW";
  if (m.result === "TEAM_A_WIN") return selfSide === "A" ? "WIN" : "LOSS";
  return selfSide === "A" ? "LOSS" : "WIN";
}

export default async function H2HPage({
  searchParams,
}: {
  searchParams: Promise<{ player?: string }>;
}) {
  const { player: playerId } = await searchParams;

  const players = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const nameById = new Map(players.map((p) => [p.id, p.name]));

  let matches: Match[] = [];
  const totalsByOpponent = new Map<string, { wins: number; losses: number; draws: number }>();

  if (playerId) {
    matches = await prisma.match.findMany({
      where: {
        status: "APPROVED",
        OR: [
          { teamAPlayer1: playerId },
          { teamAPlayer2: playerId },
          { teamBPlayer1: playerId },
          { teamBPlayer2: playerId },
        ],
      },
      orderBy: { approvalSeq: "desc" },
    });

    for (const m of matches) {
      const selfSide = teamOf(m, playerId);
      if (!selfSide) continue;
      const outcome = outcomeFor(m, selfSide);
      for (const oppId of opponentsOf(m, selfSide)) {
        const rec = totalsByOpponent.get(oppId) ?? { wins: 0, losses: 0, draws: 0 };
        if (outcome === "WIN") rec.wins += 1;
        else if (outcome === "LOSS") rec.losses += 1;
        else rec.draws += 1;
        totalsByOpponent.set(oppId, rec);
      }
    }
  }

  const opponentRows = Array.from(totalsByOpponent.entries())
    .map(([opponentId, rec]) => ({ opponentId, ...rec, total: rec.wins + rec.losses + rec.draws }))
    .sort((a, b) => b.total - a.total || (nameById.get(a.opponentId) ?? "").localeCompare(nameById.get(b.opponentId) ?? ""));

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <h1 className="text-2xl font-bold">상대전적</h1>

      <SearchForm players={players} defaultValue={playerId} />

      {playerId && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              {nameById.get(playerId) ?? "?"}의 상대별 전적
            </h2>
            {opponentRows.length === 0 ? (
              <p className="text-sm text-gray-500">완료된 경기 기록이 없습니다.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2">상대</th>
                    <th>전적</th>
                  </tr>
                </thead>
                <tbody>
                  {opponentRows.map((row) => (
                    <tr key={row.opponentId} className="border-b">
                      <td className="py-2">{nameById.get(row.opponentId) ?? "?"}</td>
                      <td className="text-gray-700">
                        {row.wins}승 {row.draws}무 {row.losses}패 (총 {row.total}경기)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">최근 경기</h2>
            <ul className="space-y-2">
              {matches.length === 0 && (
                <p className="text-sm text-gray-500">완료된 경기가 없습니다.</p>
              )}
              {matches.map((m) => {
                const selfSide = teamOf(m, playerId);
                if (!selfSide) return null;
                const outcome = outcomeFor(m, selfSide);
                const outcomeLabel =
                  outcome === "WIN" ? "승" : outcome === "LOSS" ? "패" : "무";
                const opponentNames = opponentsOf(m, selfSide)
                  .map((id) => nameById.get(id) ?? "?")
                  .join(" / ");
                return (
                  <li key={m.id} className="rounded border px-4 py-3 text-sm">
                    <p className="text-gray-500">
                      {m.type === "SINGLES" ? "단식" : "복식"} ·{" "}
                      {m.playedAt.toISOString().slice(0, 10)}
                    </p>
                    <p className="font-medium">
                      vs {opponentNames} — {outcomeLabel}
                      {m.teamAScore !== null && m.teamBScore !== null
                        ? ` (${m.teamAScore}:${m.teamBScore})`
                        : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
