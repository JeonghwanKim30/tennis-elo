import { prisma } from "@/lib/prisma";
import { avatarSrc } from "@/lib/avatar";
import { RESULT_LABEL } from "@/lib/matchDisplay";
import { type TeamPlayer } from "@/components/TeamBadges";
import { MatchupRow } from "@/components/MatchupRow";
import { deleteMatchAction } from "./actions";
import { ScoreForm } from "./ScoreForm";

export async function ScoreSection() {
  const [scheduledMatches, completedMatches] = await Promise.all([
    prisma.match.findMany({
      where: { status: "PENDING" },
      include: { matchDay: true },
      orderBy: { submittedAt: "asc" },
    }),
    prisma.match.findMany({
      where: { status: "APPROVED" },
      include: { matchDay: true },
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
    select: { id: true, name: true, gender: true, profileImage: true, profileImageType: true },
  });
  const playerById = new Map<string, TeamPlayer>(
    players.map((p) => [p.id, { id: p.id, name: p.name, avatarSrc: avatarSrc(p) }])
  );

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          예정된 경기 — 점수 입력 ({scheduledMatches.length})
        </h2>
        {scheduledMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">점수 입력을 기다리는 경기가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {scheduledMatches.map((m) => {
              const a1 = playerById.get(m.teamAPlayer1);
              const a2 = m.teamAPlayer2 ? playerById.get(m.teamAPlayer2) : null;
              const b1 = playerById.get(m.teamBPlayer1);
              const b2 = m.teamBPlayer2 ? playerById.get(m.teamBPlayer2) : null;
              if (!a1 || !b1) return null;
              return (
                <li key={m.id} className="surface-card space-y-3 px-5 py-4">
                  <p className="text-sm text-muted-foreground">
                    {m.type === "SINGLES" ? "단식" : "복식"} ·{" "}
                    {m.matchDay.date.toISOString().slice(0, 10)}
                  </p>
                  <MatchupRow type={m.type} teamA1={a1} teamA2={a2} teamB1={b1} teamB2={b2} />
                  <ScoreForm matchId={m.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">완료된 경기</h2>
        {completedMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">완료된 경기가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {completedMatches.map((m) => {
              const a1 = playerById.get(m.teamAPlayer1);
              const a2 = m.teamAPlayer2 ? playerById.get(m.teamAPlayer2) : null;
              const b1 = playerById.get(m.teamBPlayer1);
              const b2 = m.teamBPlayer2 ? playerById.get(m.teamBPlayer2) : null;
              if (!a1 || !b1) return null;
              return (
                <li key={m.id} className="surface-card space-y-3 px-5 py-4">
                  <p className="text-sm text-muted-foreground">
                    {m.type === "SINGLES" ? "단식" : "복식"} ·{" "}
                    {m.matchDay.date.toISOString().slice(0, 10)}
                  </p>
                  <MatchupRow
                    type={m.type}
                    teamA1={a1}
                    teamA2={a2}
                    teamB1={b1}
                    teamB2={b2}
                    teamAEloChange={m.teamAEloChange}
                    teamBEloChange={m.teamBEloChange}
                    center={
                      <span className="font-medium">
                        {m.result ? RESULT_LABEL[m.result] : ""}
                        {m.teamAScore !== null && m.teamBScore !== null
                          ? ` (${m.teamAScore}:${m.teamBScore})`
                          : ""}
                      </span>
                    }
                  />
                  <form action={deleteMatchAction.bind(null, m.id)}>
                    <button className="btn-press touch-target rounded-full bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
                      삭제
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
