import {
  calculateDoublesElo,
  calculateSinglesElo,
  doublesGenderMultiplier,
  singlesGenderMultiplier,
  applyCrossGenderSinglesBonus,
  INITIAL_RATING,
  type MatchOutcome,
  type PlayerGender,
} from "@/lib/elo";
import type { Prisma, MatchResult, MatchType } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

interface MatchPlayers {
  id: string;
  type: MatchType;
  teamAPlayer1: string;
  teamAPlayer2: string | null;
  teamBPlayer1: string;
  teamBPlayer2: string | null;
  teamAScore: number;
  teamBScore: number;
}

/**
 * 한 경기의 결과를 EloRating/EloHistory에 반영하고, 경기 자체(Match)에도
 * 팀별 ELO 변동량을 기록한다. 새 경기 승인, 그리고 삭제 후 전체
 * 재계산(replay) 양쪽에서 공용으로 사용한다.
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

  const [ratingRows, userRows] = await Promise.all([
    tx.eloRating.findMany({ where: { userId: { in: allIds }, type: match.type } }),
    tx.user.findMany({ where: { id: { in: allIds } }, select: { id: true, gender: true } }),
  ]);
  const ratingByUser = new Map(ratingRows.map((r) => [r.userId, r]));
  const genderByUser = new Map<string, PlayerGender>(userRows.map((u) => [u.id, u.gender]));
  const gamesPlayed = (userId: string) => {
    const r = ratingByUser.get(userId)!;
    return r.wins + r.losses + r.draws;
  };

  // 남/녀 단식·복식 매치 특성을 반영한 보정 배율(lib/elo.ts 참고).
  const genderMultiplier =
    match.type === "SINGLES"
      ? singlesGenderMultiplier(genderByUser.get(teamAIds[0])!, genderByUser.get(teamBIds[0])!)
      : doublesGenderMultiplier(allIds.map((id) => genderByUser.get(id)!));

  const outcomeForTeamA: MatchOutcome =
    result === "TEAM_A_WIN" ? "WIN" : result === "TEAM_B_WIN" ? "LOSS" : "DRAW";
  const outcomeForTeamB: MatchOutcome =
    result === "TEAM_A_WIN" ? "LOSS" : result === "TEAM_B_WIN" ? "WIN" : "DRAW";

  let newRatings: Map<string, number>;
  let teamAEloChange: number;
  let teamBEloChange: number;

  if (match.type === "SINGLES") {
    const a = ratingByUser.get(teamAIds[0])!;
    const b = ratingByUser.get(teamBIds[0])!;
    const genderA = genderByUser.get(teamAIds[0])!;
    const genderB = genderByUser.get(teamBIds[0])!;

    // 남녀 단식(성별이 다른 단식)이면 여성 쪽 점수에 보너스 세트를 더해서
    // ELO 점수 격차(MOV) 계산에만 반영한다 — 승패 판정 자체는 그대로 둔다.
    const { scoreA, scoreB } = applyCrossGenderSinglesBonus(
      match.teamAScore,
      match.teamBScore,
      genderA,
      genderB
    );

    const eloResult = calculateSinglesElo(
      a.rating,
      gamesPlayed(teamAIds[0]),
      b.rating,
      gamesPlayed(teamBIds[0]),
      scoreA,
      scoreB,
      outcomeForTeamA,
      genderMultiplier
    );
    newRatings = new Map([
      [teamAIds[0], eloResult.ratingA],
      [teamBIds[0], eloResult.ratingB],
    ]);
    teamAEloChange = eloResult.deltaA;
    teamBEloChange = eloResult.deltaB;
  } else {
    const a1 = ratingByUser.get(teamAIds[0])!;
    const a2 = ratingByUser.get(teamAIds[1])!;
    const b1 = ratingByUser.get(teamBIds[0])!;
    const b2 = ratingByUser.get(teamBIds[1])!;
    const eloResult = calculateDoublesElo(
      [
        { rating: a1.rating, gamesPlayed: gamesPlayed(teamAIds[0]) },
        { rating: a2.rating, gamesPlayed: gamesPlayed(teamAIds[1]) },
      ],
      [
        { rating: b1.rating, gamesPlayed: gamesPlayed(teamBIds[0]) },
        { rating: b2.rating, gamesPlayed: gamesPlayed(teamBIds[1]) },
      ],
      match.teamAScore,
      match.teamBScore,
      outcomeForTeamA,
      genderMultiplier
    );
    newRatings = new Map([
      [teamAIds[0], eloResult.teamA[0]],
      [teamAIds[1], eloResult.teamA[1]],
      [teamBIds[0], eloResult.teamB[0]],
      [teamBIds[1], eloResult.teamB[1]],
    ]);
    teamAEloChange = eloResult.deltaA;
    teamBEloChange = eloResult.deltaB;
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

  await tx.match.update({
    where: { id: match.id },
    data: { teamAEloChange, teamBEloChange },
  });
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
    await applyEloForMatch(
      tx,
      { ...match, teamAScore: match.teamAScore!, teamBScore: match.teamBScore! },
      match.result!
    );
  }
}
