import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { avatarSrc } from "@/lib/avatar";
import { RESULT_LABEL } from "@/lib/matchDisplay";
import { type TeamPlayer } from "@/components/TeamBadges";
import { MatchupRow } from "@/components/MatchupRow";
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
    <main className="mx-auto max-w-3xl space-y-10 px-4 py-12">
      <h1 className="text-2xl font-bold">관리자 대시보드</h1>

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
    </main>
  );
}
