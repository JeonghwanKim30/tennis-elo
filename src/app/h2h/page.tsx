import { prisma } from "@/lib/prisma";
import type { Match } from "@/generated/prisma/client";
import { Avatar } from "@/components/Avatar";
import { avatarSrc } from "@/lib/avatar";
import type { TeamPlayer } from "@/components/TeamBadges";
import { SearchForm } from "./SearchForm";

type Outcome = "WIN" | "LOSS" | "DRAW";
type MatchWithDay = Match & { matchDay: { date: Date } };

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
    select: { id: true, name: true, gender: true, profileImage: true, profileImageType: true },
    orderBy: { name: "asc" },
  });
  // 검색창(클라이언트 컴포넌트)에는 이름 검색에 필요한 최소 정보만 넘긴다.
  // profileImage(Bytes)는 서버-클라이언트 경계를 못 넘어가므로 여기서 걸러낸다.
  const searchablePlayers = players.map((p) => ({ id: p.id, name: p.name }));
  const nameById = new Map(players.map((p) => [p.id, p.name]));
  const playerById = new Map<string, TeamPlayer>(
    players.map((p) => [p.id, { id: p.id, name: p.name, avatarSrc: avatarSrc(p) }])
  );

  let matches: MatchWithDay[] = [];
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
      include: { matchDay: true },
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

      <SearchForm players={searchablePlayers} defaultValue={playerId} />

      {playerId && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              {nameById.get(playerId) ?? "?"}의 상대별 전적
            </h2>
            {opponentRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">완료된 경기 기록이 없습니다.</p>
            ) : (
              <div className="surface-card overflow-x-auto p-2">
                <table className="w-full min-w-[20rem] text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">상대</th>
                      <th className="font-medium">전적</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opponentRows.map((row) => {
                      const opponent = playerById.get(row.opponentId);
                      return (
                        <tr key={row.opponentId} className="border-t border-border first:border-t-0">
                          <td className="px-3 py-2.5">
                            {opponent ? (
                              <div className="flex items-center gap-2">
                                <Avatar src={opponent.avatarSrc} size="sm" />
                                <span>{opponent.name}</span>
                              </div>
                            ) : (
                              "?"
                            )}
                          </td>
                          <td className="text-foreground/80">
                            {row.wins}승 {row.draws}무 {row.losses}패 (총 {row.total}경기)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">최근 경기</h2>
            <ul className="space-y-3">
              {matches.length === 0 && (
                <p className="text-sm text-muted-foreground">완료된 경기가 없습니다.</p>
              )}
              {matches.map((m) => {
                const selfSide = teamOf(m, playerId);
                if (!selfSide) return null;
                const outcome = outcomeFor(m, selfSide);
                const outcomeLabel =
                  outcome === "WIN" ? "승" : outcome === "LOSS" ? "패" : "무";
                const opponents = opponentsOf(m, selfSide)
                  .map((id) => playerById.get(id))
                  .filter((p): p is TeamPlayer => !!p);
                return (
                  <li key={m.id} className="surface-card px-5 py-4 text-sm">
                    <p className="mb-2 text-muted-foreground">
                      {m.type === "SINGLES" ? "단식" : "복식"} ·{" "}
                      {m.matchDay.date.toISOString().slice(0, 10)}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {opponents.map((p) => (
                          <div key={p.id} className="flex max-w-[6rem] items-center gap-1">
                            <Avatar src={p.avatarSrc} size="sm" />
                            <span className="truncate">{p.name}</span>
                          </div>
                        ))}
                      </div>
                      <span className="font-medium">
                        — {outcomeLabel}
                        {m.teamAScore !== null && m.teamBScore !== null
                          ? ` (${m.teamAScore}:${m.teamBScore})`
                          : ""}
                      </span>
                    </div>
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
