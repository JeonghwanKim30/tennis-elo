export const INITIAL_RATING = 1200;

// 경기 수가 이 값 이하이면 레이팅이 아직 불안정하다고 보고 K를 높게(더 유동적으로) 잡는다.
const PROVISIONAL_GAMES_THRESHOLD = 5;
const K_FACTOR_PROVISIONAL = 32;
const K_FACTOR_ESTABLISHED = 24;

export type MatchOutcome = "WIN" | "LOSS" | "DRAW";

export function outcomeScore(outcome: MatchOutcome): number {
  if (outcome === "WIN") return 1;
  if (outcome === "LOSS") return 0;
  return 0.5;
}

// 경기 수(승+패+무) 기준 가변 K-Factor.
export function kFactorFor(gamesPlayed: number): number {
  return gamesPlayed <= PROVISIONAL_GAMES_THRESHOLD ? K_FACTOR_PROVISIONAL : K_FACTOR_ESTABLISHED;
}

export function expectedScore(ratingSelf: number, ratingOpponent: number): number {
  return 1 / (1 + 10 ** ((ratingOpponent - ratingSelf) / 400));
}

/**
 * 스코어 격차(margin of victory) 가중치.
 * 게임 스코어 차이가 클수록, 그리고 레이팅상 이변(약체의 승리)일수록 배율이 커진다.
 * 값이 1.0 미만이면 1.0으로 보정한다.
 */
export function movMultiplier(
  gameScoreA: number,
  gameScoreB: number,
  winnerRating: number,
  loserRating: number
): number {
  const gameDiff = Math.abs(gameScoreA - gameScoreB);
  const raw = Math.log(gameDiff + 1) * (2.2 / ((winnerRating - loserRating) * 0.001 + 2.2));
  return Math.max(raw, 1.0);
}

export interface EloMatchInput {
  ratingA: number;
  ratingB: number;
  /** A측 경기 수 (복식이면 두 선수 중 더 적은 쪽) — K-Factor 산출에 쓰인다. */
  gamesPlayedA: number;
  gamesPlayedB: number;
  gameScoreA: number;
  gameScoreB: number;
  resultForA: MatchOutcome;
}

export interface EloMatchResult {
  deltaA: number;
  deltaB: number;
  expectedA: number;
  kFactor: number;
  movMultiplier: number;
}

/**
 * 단식/복식 공용 ELO 변동량 계산 — 승패, 게임 스코어 격차(MOV), 레이팅 차이를
 * 종합해 한 번의 델타를 산출하고, 이긴 쪽/진 쪽에 부호만 반대로 동일하게 적용한다.
 * (복식에서 팀원 두 명에게 동일한 델타를 적용해야 하므로, K-Factor도 매치당
 * 하나만 쓴다 — 두 선수 중 경기 수가 더 적어 아직 레이팅이 안정되지 않은
 * 쪽이 있으면 매치 전체를 더 유동적으로 다룬다.)
 */
export function calculateEloChange(input: EloMatchInput): EloMatchResult {
  const { ratingA, ratingB, gamesPlayedA, gamesPlayedB, gameScoreA, gameScoreB, resultForA } = input;

  const expectedA = expectedScore(ratingA, ratingB);
  const actualA = outcomeScore(resultForA);
  const kFactor = kFactorFor(Math.min(gamesPlayedA, gamesPlayedB));

  const winnerRating = resultForA === "LOSS" ? ratingB : ratingA;
  const loserRating = resultForA === "LOSS" ? ratingA : ratingB;
  const mov = movMultiplier(gameScoreA, gameScoreB, winnerRating, loserRating);

  // 0에 -1을 곱하면 -0이 나와 이후 정수 비교/직렬화에서 미묘한 문제를 일으킬 수 있으므로 정규화한다.
  const deltaA = Math.round(kFactor * mov * (actualA - expectedA)) || 0;

  return { deltaA, deltaB: deltaA === 0 ? 0 : -deltaA, expectedA, kFactor, movMultiplier: mov };
}

export function calculateSinglesElo(
  ratingA: number,
  gamesPlayedA: number,
  ratingB: number,
  gamesPlayedB: number,
  gameScoreA: number,
  gameScoreB: number,
  resultForA: MatchOutcome
): { ratingA: number; ratingB: number } & EloMatchResult {
  const eloChange = calculateEloChange({
    ratingA,
    ratingB,
    gamesPlayedA,
    gamesPlayedB,
    gameScoreA,
    gameScoreB,
    resultForA,
  });

  return {
    ratingA: ratingA + eloChange.deltaA,
    ratingB: ratingB + eloChange.deltaB,
    ...eloChange,
  };
}

export interface PlayerEloInput {
  rating: number;
  gamesPlayed: number;
}

/**
 * 팀 레이팅은 두 선수 레이팅의 평균으로 계산하고,
 * 팀 단위로 산출된 delta를 두 선수 모두에게 동일하게 적용한다.
 */
export function calculateDoublesElo(
  teamA: [PlayerEloInput, PlayerEloInput],
  teamB: [PlayerEloInput, PlayerEloInput],
  gameScoreA: number,
  gameScoreB: number,
  resultForTeamA: MatchOutcome
): { teamA: [number, number]; teamB: [number, number] } & EloMatchResult {
  const ratingA = (teamA[0].rating + teamA[1].rating) / 2;
  const ratingB = (teamB[0].rating + teamB[1].rating) / 2;
  const gamesPlayedA = Math.min(teamA[0].gamesPlayed, teamA[1].gamesPlayed);
  const gamesPlayedB = Math.min(teamB[0].gamesPlayed, teamB[1].gamesPlayed);

  const eloChange = calculateEloChange({
    ratingA,
    ratingB,
    gamesPlayedA,
    gamesPlayedB,
    gameScoreA,
    gameScoreB,
    resultForA: resultForTeamA,
  });

  return {
    teamA: [teamA[0].rating + eloChange.deltaA, teamA[1].rating + eloChange.deltaA],
    teamB: [teamB[0].rating + eloChange.deltaB, teamB[1].rating + eloChange.deltaB],
    ...eloChange,
  };
}
