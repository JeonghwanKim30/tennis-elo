import { prisma } from "@/lib/prisma";
import { avatarSrc } from "@/lib/avatar";
import { RESULT_LABEL } from "@/lib/matchDisplay";
import { type TeamPlayer } from "@/components/TeamBadges";
import { MatchupRow } from "@/components/MatchupRow";
import { MatchScoreCard } from "@/components/MatchScoreCard";
import { SquareDeleteButton } from "@/components/SquareDeleteButton";
import { deleteMatchAction, enterMatchScoreAction } from "./actions";

export async function ScoreSection() {
  // 세 쿼리 모두 독립적이라 병렬로 실행한다 — 예전엔 매치 두 건을 먼저 받아
  // teamAPlayer1 등에서 playerIds를 뽑아낸 "다음"에야 유저 조회를 시작했는데,
  // 그러면 원격 DB 왕복이 매번 3번 순서대로 나가 지연이 그대로 합산됐다.
  // 유저 전체를 미리 한 번에 가져와도(동호회 규모상 수십~수백 명 수준) 이후
  // Map 조회는 메모리 안에서 끝나므로, 매치 필드로 걸러서 조회하는 것과
  // 결과는 동일하면서 왕복 횟수만 3번 -> 2번(병렬)으로 줄어든다. status 필터를
  // 걸지 않는 이유는 추방/탈퇴된 유저가 과거 완료 경기에 등장할 수 있어서다
  // (해당 유저만 목록에서 빠지면 매치 자체가 렌더링에서 통째로 스킵된다).
  const [scheduledMatches, completedMatches, allUsers] = await Promise.all([
    prisma.match.findMany({
      where: { status: "PENDING" },
      include: { matchDay: true },
      orderBy: { submittedAt: "asc" },
    }),
    prisma.match.findMany({
      where: { status: "APPROVED" },
      include: { matchDay: true, eloHistory: { select: { userId: true, delta: true } } },
      orderBy: { approvalSeq: "desc" },
      take: 30,
    }),
    prisma.user.findMany({
      select: { id: true, name: true, gender: true, profileImage: true, profileImageType: true },
    }),
  ]);

  const playerById = new Map<string, TeamPlayer>(
    allUsers.map((p) => [p.id, { id: p.id, name: p.name, avatarSrc: avatarSrc(p) }])
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
              const typeLabel = m.type === "SINGLES" ? "단식" : "복식";
              const dateLabel = m.matchDay.date.toISOString().slice(0, 10);
              const submitted = m.teamAScore !== null && m.teamBScore !== null;
              return (
                <li key={m.id}>
                  <MatchScoreCard
                    action={enterMatchScoreAction.bind(null, m.id)}
                    deleteAction={deleteMatchAction.bind(null, m.id)}
                    type={m.type}
                    teamA1={a1}
                    teamA2={a2}
                    teamB1={b1}
                    teamB2={b2}
                    initialTeamAScore={m.teamAScore}
                    initialTeamBScore={m.teamBScore}
                    statusLabel={`${typeLabel} · ${dateLabel} · ${submitted ? "제출됨 · 승인 대기" : "미제출"}`}
                    submitLabel="승인"
                  />
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
              const eloChangeByPlayer = Object.fromEntries(m.eloHistory.map((h) => [h.userId, h.delta]));
              return (
                <li key={m.id} className="surface-card space-y-3 px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {m.type === "SINGLES" ? "단식" : "복식"} ·{" "}
                      {m.matchDay.date.toISOString().slice(0, 10)}
                    </p>
                    <SquareDeleteButton action={deleteMatchAction.bind(null, m.id)} label="경기 삭제" />
                  </div>
                  <MatchupRow
                    type={m.type}
                    teamA1={a1}
                    teamA2={a2}
                    teamB1={b1}
                    teamB2={b2}
                    eloChangeByPlayer={eloChangeByPlayer}
                    resultLabel={m.result ? RESULT_LABEL[m.result] : undefined}
                    scoreLabel={
                      m.teamAScore !== null && m.teamBScore !== null
                        ? `(${m.teamAScore}:${m.teamBScore})`
                        : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
