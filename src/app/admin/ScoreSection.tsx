import { prisma } from "@/lib/prisma";
import { avatarSrc } from "@/lib/avatar";
import { RESULT_LABEL } from "@/lib/matchDisplay";
import { type TeamPlayer } from "@/components/TeamBadges";
import { deleteMatchAction, enterMatchScoreAction } from "./actions";
import { ScheduledMatchList, type ScheduledMatchItem } from "./ScheduledMatchList";
import { CompletedMatchList, type CompletedMatchItem } from "./CompletedMatchList";

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

  // 목록 렌더링(최근 5개 + 더보기)은 클라이언트 컴포넌트(ScheduledMatchList/
  // CompletedMatchList)가 맡고, 여기서는 표시에 필요한 값만 미리 계산해서
  // 넘긴다 — bind된 서버 액션은 그대로 클라이언트 컴포넌트에 prop으로 전달 가능하다.
  const scheduledItems: ScheduledMatchItem[] = scheduledMatches
    .map((m): ScheduledMatchItem | null => {
      const a1 = playerById.get(m.teamAPlayer1);
      const a2 = m.teamAPlayer2 ? playerById.get(m.teamAPlayer2) : null;
      const b1 = playerById.get(m.teamBPlayer1);
      const b2 = m.teamBPlayer2 ? playerById.get(m.teamBPlayer2) : null;
      if (!a1 || !b1) return null;
      const typeLabel = m.type === "SINGLES" ? "단식" : "복식";
      const dateLabel = m.matchDay.date.toISOString().slice(0, 10);
      const submitted = m.teamAScore !== null && m.teamBScore !== null;
      return {
        id: m.id,
        type: m.type,
        teamA1: a1,
        teamA2: a2,
        teamB1: b1,
        teamB2: b2,
        initialTeamAScore: m.teamAScore,
        initialTeamBScore: m.teamBScore,
        statusLabel: `${typeLabel} · ${dateLabel} · ${submitted ? "제출됨 · 승인 대기" : "미제출"}`,
        action: enterMatchScoreAction.bind(null, m.id),
        deleteAction: deleteMatchAction.bind(null, m.id),
      };
    })
    .filter((item): item is ScheduledMatchItem => item !== null);

  const completedItems: CompletedMatchItem[] = completedMatches
    .map((m): CompletedMatchItem | null => {
      const a1 = playerById.get(m.teamAPlayer1);
      const a2 = m.teamAPlayer2 ? playerById.get(m.teamAPlayer2) : null;
      const b1 = playerById.get(m.teamBPlayer1);
      const b2 = m.teamBPlayer2 ? playerById.get(m.teamBPlayer2) : null;
      if (!a1 || !b1) return null;
      const eloChangeByPlayer = Object.fromEntries(m.eloHistory.map((h) => [h.userId, h.delta]));
      return {
        id: m.id,
        type: m.type,
        dateTypeLabel: `${m.type === "SINGLES" ? "단식" : "복식"} · ${m.matchDay.date.toISOString().slice(0, 10)}`,
        teamA1: a1,
        teamA2: a2,
        teamB1: b1,
        teamB2: b2,
        eloChangeByPlayer,
        resultLabel: m.result ? RESULT_LABEL[m.result] : undefined,
        scoreLabel: m.teamAScore !== null && m.teamBScore !== null ? `(${m.teamAScore}:${m.teamBScore})` : undefined,
        deleteAction: deleteMatchAction.bind(null, m.id),
      };
    })
    .filter((item): item is CompletedMatchItem => item !== null);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          예정된 경기 — 점수 입력 ({scheduledItems.length})
        </h2>
        {scheduledItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">점수 입력을 기다리는 경기가 없습니다.</p>
        ) : (
          <ScheduledMatchList items={scheduledItems} />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">완료된 경기</h2>
        {completedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">완료된 경기가 없습니다.</p>
        ) : (
          <CompletedMatchList items={completedItems} />
        )}
      </section>
    </div>
  );
}
