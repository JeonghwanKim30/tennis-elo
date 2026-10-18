import {
  calculateDoublesElo,
  calculateSinglesElo,
  doublesGenderMultiplier,
  singlesGenderMultiplier,
  applyCrossGenderSinglesBonus,
  isCrossGenderSingles,
  outcomeFromScores,
  INITIAL_RATING,
  PROVISIONAL_GAMES_THRESHOLD,
  type MatchOutcome,
  type PlayerGender,
} from "@/lib/elo";
import type { Prisma, MatchResult, MatchType } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

interface MatchPlayers {
  id: string;
  matchDayId: string;
  type: MatchType;
  teamAPlayer1: string;
  teamAPlayer2: string | null;
  teamBPlayer1: string;
  teamBPlayer2: string | null;
  teamAScore: number;
  teamBScore: number;
}

// 한 경기에 등장하는 선수의 계산 입력값 — 회원은 EloRating에서, 게스트는
// 관리자가 입력한 MMR에서 온다.
interface ResolvedPlayer {
  rating: number;
  gamesPlayed: number;
  gender: PlayerGender;
  // 회원만 EloRating/EloHistory에 기록한다(게스트는 User FK가 없어 애초에 불가).
  isMember: boolean;
  // 회원의 반영 전 레이팅 — EloHistory.ratingBefore로 쓴다.
  ratingBefore?: number;
}

/**
 * 경기에 등장하는 모든 id를 회원/게스트로 나눠 레이팅과 성별을 해결한다.
 *
 * 특수 이벤트(MT/대회)에는 계정이 없는 외부 게스트가 섞여 들어오는데,
 * Match.teamAPlayer* 는 FK가 아닌 순수 String 컬럼이라 게스트 id가 그대로
 * 들어가 있다. 반면 EloRating/EloHistory.userId는 User FK라서 게스트에게는
 * 행을 만들 수 없다 — 그래서 게스트는 "상대 실력 추정치"로 계산에만 참여하고
 * 자신의 레이팅은 남기지 않는다.
 */
async function resolvePlayers(tx: Tx, playerIds: string[]): Promise<Map<string, ResolvedPlayer>> {
  const [userRows, guestRows] = await Promise.all([
    tx.user.findMany({ where: { id: { in: playerIds } }, select: { id: true, gender: true } }),
    tx.eventGuest.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, gender: true, mmr: true },
    }),
  ]);

  const resolved = new Map<string, ResolvedPlayer>();

  for (const guest of guestRows) {
    resolved.set(guest.id, {
      rating: guest.mmr,
      // 게스트의 레이팅은 추적하지 않으므로 "배치 중"으로 둘 이유가 없다. 복식 K는
      // 팀원 중 최소 경기 수를 쓰는데(Math.min), 게스트를 0경기로 두면 같은 팀
      // 회원의 K까지 배치 구간으로 끌어올려 회원 레이팅이 과하게 흔들린다.
      gamesPlayed: PROVISIONAL_GAMES_THRESHOLD,
      gender: guest.gender,
      isMember: false,
    });
  }

  // 회원은 아래에서 EloRating 실제 값으로 덮어쓴다(여기서는 자리만 만든다).
  for (const user of userRows) {
    resolved.set(user.id, {
      rating: INITIAL_RATING,
      gamesPlayed: 0,
      gender: user.gender,
      isMember: true,
    });
  }

  const unknown = playerIds.filter((id) => !resolved.has(id));
  if (unknown.length > 0) {
    // 배정된 채로 삭제된 게스트 등 — 조용히 1200으로 계산하면 레이팅이 잘못
    // 반영되므로 명확히 실패시킨다.
    throw new Error("경기에 존재하지 않는 참가자가 있습니다: " + unknown.join(", "));
  }

  return resolved;
}

/**
 * 한 경기의 결과를 EloRating/EloHistory에 반영하고, 경기 자체(Match)에도
 * 팀별 ELO 변동량을 기록한다. 새 경기 승인, 그리고 삭제 후 전체
 * 재계산(replay) 양쪽에서 공용으로 사용한다.
 *
 * 특수 이벤트의 eloMode가 NONE이면 스코어/승패만 남기고 레이팅은 전혀 건드리지
 * 않는다(MT 기본값) — 재계산 replay도 같은 판정을 거치므로 결과가 일관된다.
 */
export async function applyEloForMatch(tx: Tx, match: MatchPlayers, result: MatchResult) {
  const teamAIds = [match.teamAPlayer1, match.teamAPlayer2].filter(
    (id): id is string => !!id
  );
  const teamBIds = [match.teamBPlayer1, match.teamBPlayer2].filter(
    (id): id is string => !!id
  );
  const allIds = [...teamAIds, ...teamBIds];

  // 이벤트 경기는 eloMode에 따라 레이팅 반영 자체를 건너뛴다.
  const matchDay = await tx.matchDay.findUniqueOrThrow({
    where: { id: match.matchDayId },
    select: { kind: true, eloMode: true },
  });
  if (matchDay.kind === "SPECIAL" && matchDay.eloMode === "NONE") return;

  const players = await resolvePlayers(tx, allIds);
  const memberIds = allIds.filter((id) => players.get(id)!.isMember);

  if (memberIds.length > 0) {
    await tx.eloRating.createMany({
      data: memberIds.map((userId) => ({ userId, type: match.type, rating: INITIAL_RATING })),
      skipDuplicates: true,
    });
    const ratingRows = await tx.eloRating.findMany({
      where: { userId: { in: memberIds }, type: match.type },
    });
    for (const row of ratingRows) {
      const player = players.get(row.userId)!;
      player.rating = row.rating;
      player.ratingBefore = row.rating;
      player.gamesPlayed = row.wins + row.losses + row.draws;
    }
  }

  const inputOf = (id: string) => {
    const p = players.get(id)!;
    return { rating: p.rating, gamesPlayed: p.gamesPlayed };
  };
  const genderOf = (id: string) => players.get(id)!.gender;

  // 남/녀 단식·복식 매치 특성을 반영한 보정 배율(lib/elo.ts 참고).
  const genderMultiplier =
    match.type === "SINGLES"
      ? singlesGenderMultiplier(genderOf(teamAIds[0]), genderOf(teamBIds[0]))
      : doublesGenderMultiplier(allIds.map(genderOf));

  const outcomeForTeamA: MatchOutcome =
    result === "TEAM_A_WIN" ? "WIN" : result === "TEAM_B_WIN" ? "LOSS" : "DRAW";
  const outcomeForTeamB: MatchOutcome =
    result === "TEAM_A_WIN" ? "LOSS" : result === "TEAM_B_WIN" ? "WIN" : "DRAW";

  let newRatings: Map<string, number>;
  let teamAEloChange: number;
  let teamBEloChange: number;

  if (match.type === "SINGLES") {
    const a = inputOf(teamAIds[0]);
    const b = inputOf(teamBIds[0]);
    const genderA = genderOf(teamAIds[0]);
    const genderB = genderOf(teamBIds[0]);

    // 남녀 단식(성별이 다른 단식)이면 여성 쪽 점수에 보너스 세트를 더한다.
    // 실제 경기 기록/전적(teamAScore, outcomeForTeamA로 계산되는 승/패
    // 카운트)은 원래 스코어 그대로 두지만, ELO 연산 자체는 보너스가 반영된
    // 스코어를 기준으로 승/패를 다시 판정해서 계산한다 — 그래야 보너스로
    // 스코어 우열이 뒤집힌 경우(예: 5:4 -> 5:6) ELO에도 실제로 반영된다.
    // (주의: MOV 배율은 |A-B| 절댓값만 보므로, 보너스가 격차의 "부호"만
    // 뒤집고 크기는 그대로인 경우 MOV 자체는 안 변한다 — 그래서 승패
    // 판정을 별도로 다시 하지 않으면 보너스가 있으나 마나였다.)
    const { scoreA, scoreB } = applyCrossGenderSinglesBonus(
      match.teamAScore,
      match.teamBScore,
      genderA,
      genderB
    );
    const eloOutcomeForTeamA = isCrossGenderSingles(genderA, genderB)
      ? outcomeFromScores(scoreA, scoreB)
      : outcomeForTeamA;

    const eloResult = calculateSinglesElo(
      a.rating,
      a.gamesPlayed,
      b.rating,
      b.gamesPlayed,
      scoreA,
      scoreB,
      eloOutcomeForTeamA,
      genderMultiplier
    );
    newRatings = new Map([
      [teamAIds[0], eloResult.ratingA],
      [teamBIds[0], eloResult.ratingB],
    ]);
    teamAEloChange = eloResult.deltaA;
    teamBEloChange = eloResult.deltaB;
  } else {
    const eloResult = calculateDoublesElo(
      [inputOf(teamAIds[0]), inputOf(teamAIds[1])],
      [inputOf(teamBIds[0]), inputOf(teamBIds[1])],
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

  // 게스트는 EloRating/EloHistory에 행을 만들 수 없으므로(User FK) 회원만 기록한다.
  for (const userId of memberIds) {
    const before = players.get(userId)!.ratingBefore!;
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
        ratingBefore: before,
        ratingAfter: after,
        delta: after - before,
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
