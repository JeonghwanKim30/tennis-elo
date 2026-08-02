import { calculateDoublesElo, calculateSinglesElo, INITIAL_RATING, type MatchOutcome } from "@/lib/elo";
import type { Prisma, MatchResult, MatchType } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

interface MatchPlayers {
  id: string;
  type: MatchType;
  teamAPlayer1: string;
  teamAPlayer2: string | null;
  teamBPlayer1: string;
  teamBPlayer2: string | null;
}

/**
 * 한 경기의 결과를 EloRating/EloHistory에 반영한다.
 * 새 경기 승인, 그리고 삭제 후 전체 재계산(replay) 양쪽에서 공용으로 사용한다.
 */
export async function applyEloForMatch(tx: Tx, match: MatchPlayers, result: MatchResult) {
  const teamAIds = [match.teamAPlayer1, match.teamAPlayer2].filter(
    (id): id is string => !!id
  );
  const teamBIds = [match.teamBPlayer1, match.teamBPlayer2].filter(
    (id): id is string => !!id
  );
  const allIds = [...teamAIds, ...teamBIds];

  await tx.eloRating.createMany({
    data: allIds.map((userId) => ({ userId, type: match.type, rating: INITIAL_RATING })),
    skipDuplicates: true,
  });

  const ratingRows = await tx.eloRating.findMany({
    where: { userId: { in: allIds }, type: match.type },
  });
  const ratingByUser = new Map(ratingRows.map((r) => [r.userId, r]));

  const outcomeForTeamA: MatchOutcome =
    result === "TEAM_A_WIN" ? "WIN" : result === "TEAM_B_WIN" ? "LOSS" : "DRAW";
  const outcomeForTeamB: MatchOutcome =
    result === "TEAM_A_WIN" ? "LOSS" : result === "TEAM_B_WIN" ? "WIN" : "DRAW";

  let newRatings: Map<string, number>;

  if (match.type === "SINGLES") {
    const a = ratingByUser.get(teamAIds[0])!;
    const b = ratingByUser.get(teamBIds[0])!;
    const eloResult = calculateSinglesElo(a.rating, b.rating, outcomeForTeamA);
    newRatings = new Map([
      [teamAIds[0], eloResult.ratingA],
      [teamBIds[0], eloResult.ratingB],
    ]);
  } else {
    const a1 = ratingByUser.get(teamAIds[0])!;
    const a2 = ratingByUser.get(teamAIds[1])!;
    const b1 = ratingByUser.get(teamBIds[0])!;
    const b2 = ratingByUser.get(teamBIds[1])!;
    const eloResult = calculateDoublesElo(
      [a1.rating, a2.rating],
      [b1.rating, b2.rating],
      outcomeForTeamA
    );
    newRatings = new Map([
      [teamAIds[0], eloResult.teamA[0]],
      [teamAIds[1], eloResult.teamA[1]],
      [teamBIds[0], eloResult.teamB[0]],
      [teamBIds[1], eloResult.teamB[1]],
    ]);
  }

  for (const userId of allIds) {
    const before = ratingByUser.get(userId)!;
    const after = newRatings.get(userId)!;
    const outcome = teamAIds.includes(userId) ? outcomeForTeamA : outcomeForTeamB;

    await tx.eloRating.update({
      where: { userId_type: { userId, type: match.type } },
      data: {
        rating: after,
        wins: { increment: outcome === "WIN" ? 1 : 0 },
        losses: { increment: outcome === "LOSS" ? 1 : 0 },
        draws: { increment: outcome === "DRAW" ? 1 : 0 },
      },
    });

    await tx.eloHistory.create({
      data: {
        matchId: match.id,
        userId,
        type: match.type,
        ratingBefore: before.rating,
        ratingAfter: after,
        delta: after - before.rating,
      },
    });
  }
}

/**
 * 경기 삭제 등으로 이력이 바뀌었을 때, 남아있는 모든 승인된 경기를
 * approvalSeq 순서대로 처음부터 재생하여 EloRating/EloHistory를 다시 만든다.
 * ELO는 순서에 의존하는 계산이라 부분 수정이 아닌 전체 재계산이 유일하게 안전한 방법이다.
 */
export async function recalculateAllElo(tx: Tx) {
  await tx.eloHistory.deleteMany({});
  await tx.eloRating.updateMany({
    data: { rating: INITIAL_RATING, wins: 0, losses: 0, draws: 0 },
  });

  const remainingMatches = await tx.match.findMany({
    where: { status: "APPROVED" },
    orderBy: { approvalSeq: "asc" },
  });

  for (const match of remainingMatches) {
    await applyEloForMatch(tx, match, match.result!);
  }
}
