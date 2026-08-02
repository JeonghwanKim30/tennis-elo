export const K_FACTOR = 32;
export const INITIAL_RATING = 1200;

export type MatchOutcome = "WIN" | "LOSS" | "DRAW";

export function outcomeScore(outcome: MatchOutcome): number {
  if (outcome === "WIN") return 1;
  if (outcome === "LOSS") return 0;
  return 0.5;
}

export function expectedScore(ratingSelf: number, ratingOpponent: number): number {
  return 1 / (1 + 10 ** ((ratingOpponent - ratingSelf) / 400));
}

function applyDelta(rating: number, expected: number, score: number): number {
  return rating + K_FACTOR * (score - expected);
}

export function calculateSinglesElo(
  ratingA: number,
  ratingB: number,
  resultForA: MatchOutcome
): { ratingA: number; ratingB: number } {
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = expectedScore(ratingB, ratingA);
  const scoreA = outcomeScore(resultForA);
  const scoreB = 1 - scoreA;

  return {
    ratingA: applyDelta(ratingA, expectedA, scoreA),
    ratingB: applyDelta(ratingB, expectedB, scoreB),
  };
}

/**
 * 팀 레이팅은 두 선수 레이팅의 평균으로 계산하고,
 * 팀 단위로 산출된 delta를 두 선수 모두에게 동일하게 적용한다.
 */
export function calculateDoublesElo(
  teamA: [number, number],
  teamB: [number, number],
  resultForTeamA: MatchOutcome
): { teamA: [number, number]; teamB: [number, number] } {
  const avgA = (teamA[0] + teamA[1]) / 2;
  const avgB = (teamB[0] + teamB[1]) / 2;
  const expectedA = expectedScore(avgA, avgB);
  const expectedB = expectedScore(avgB, avgA);
  const scoreA = outcomeScore(resultForTeamA);
  const scoreB = 1 - scoreA;

  const deltaA = K_FACTOR * (scoreA - expectedA);
  const deltaB = K_FACTOR * (scoreB - expectedB);

  return {
    teamA: [teamA[0] + deltaA, teamA[1] + deltaA],
    teamB: [teamB[0] + deltaB, teamB[1] + deltaB],
  };
}
