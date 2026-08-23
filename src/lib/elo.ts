export const INITIAL_RATING = 1200;

// 경기 수가 이 값 이하이면 레이팅이 아직 불안정하다고 보고 K를 높게(더 유동적으로) 잡는다.
// 리더보드/프로필의 "배치 중(Placement)" 표시도 이 값을 공유한다(lib/tier.ts의
// isPlacement 참고) — 배치 완료 기준(정식 랭킹 부여)은 K-Factor가 안정화되는
// 시점과 같은 기준(완료 경기 5회)을 쓰는 게 자연스럽다.
export const PROVISIONAL_GAMES_THRESHOLD = 5;
const K_FACTOR_PROVISIONAL = 32;
const K_FACTOR_ESTABLISHED = 24;

export type MatchOutcome = "WIN" | "LOSS" | "DRAW";
export type PlayerGender = "MALE" | "FEMALE";

// 남/녀 단식·복식 매치 특성을 반영한 보정 배율. 표본이 상대적으로 적은
// 여성부 매치는 레이팅이 더 빨리 수렴하도록 배율을 살짝 높이고, 성별이
// 섞인 단식(혼성 단식)은 변동성을 다소 완화한다. 동성 매치(남 vs 남,
// 남복/여복)는 기존과 동일하게 1.0(기준)을 유지한다.
const SINGLES_GENDER_MULTIPLIER = {
  MALE_MALE: 1.0,
  FEMALE_FEMALE: 1.1,
  MIXED: 0.9,
} as const;

const DOUBLES_GENDER_MULTIPLIER = {
  MALE_DOUBLES: 1.0,
  FEMALE_DOUBLES: 1.1,
  MIXED_DOUBLES: 1.0,
} as const;

export function singlesGenderMultiplier(genderA: PlayerGender, genderB: PlayerGender): number {
  if (genderA === genderB) {
    return genderA === "FEMALE" ? SINGLES_GENDER_MULTIPLIER.FEMALE_FEMALE : SINGLES_GENDER_MULTIPLIER.MALE_MALE;
  }
  return SINGLES_GENDER_MULTIPLIER.MIXED;
}

export function doublesGenderMultiplier(genders: PlayerGender[]): number {
  if (genders.every((g) => g === "FEMALE")) return DOUBLES_GENDER_MULTIPLIER.FEMALE_DOUBLES;
  if (genders.every((g) => g === "MALE")) return DOUBLES_GENDER_MULTIPLIER.MALE_DOUBLES;
  return DOUBLES_GENDER_MULTIPLIER.MIXED_DOUBLES;
}

/** 남녀 단식(성별이 다른 단식) 여부. */
export function isCrossGenderSingles(genderA: PlayerGender, genderB: PlayerGender): boolean {
  return genderA !== genderB;
}

// 경기 등록 시 별도의 "몇 점 내기"(승리 기준 세트) 입력을 받지 않으므로, 실제로
// 입력된 두 점수 중 더 큰 값을 승리 기준 세트(targetScore)로 자동 판별한다.
// 예: 3:5 -> 5, 3:4 -> 4, 3:3(무승부) -> 3.
export function resolveTargetScore(scoreA: number, scoreB: number): number {
  return Math.max(scoreA, scoreB);
}

/**
 * 남녀 단식(성별이 다른 단식) 경기에서 여성 유저의 점수에 더해주는 보너스 세트.
 * resolveTargetScore로 자동 판별한 승리 기준 세트 기준.
 * 승패 판정 자체는 바꾸지 않고, ELO 계산에 쓰이는 점수 격차(MOV)에만 반영한다.
 */
export function femaleBonusPoints(targetScore: number): number {
  if (targetScore <= 1) return 0;
  if (targetScore <= 4) return 1;
  return 2;
}

/** 두 점수를 비교해 self 기준 승/패/무를 판정한다. */
export function outcomeFromScores(scoreForSelf: number, scoreForOpponent: number): MatchOutcome {
  if (scoreForSelf > scoreForOpponent) return "WIN";
  if (scoreForSelf < scoreForOpponent) return "LOSS";
  return "DRAW";
}

/**
 * 남녀 단식이면 여성 쪽 점수에 femaleBonusPoints만큼 가상 보너스 세트를 더한
 * "ELO 계산 전용" 점수를 돌려준다. 실제 경기 기록/스코어판(teamAScore 등)에는
 * 전혀 영향을 주지 않고, calculateSinglesElo에 넘기는 입력값에만 쓰인다.
 * 동성 매치면 원래 점수를 그대로 돌려준다.
 */
export function applyCrossGenderSinglesBonus(
  scoreA: number,
  scoreB: number,
  genderA: PlayerGender,
  genderB: PlayerGender
): { scoreA: number; scoreB: number } {
  if (!isCrossGenderSingles(genderA, genderB)) return { scoreA, scoreB };

  const targetScore = resolveTargetScore(scoreA, scoreB);
  const bonus = femaleBonusPoints(targetScore);

  return {
    scoreA: genderA === "FEMALE" ? scoreA + bonus : scoreA,
    scoreB: genderB === "FEMALE" ? scoreB + bonus : scoreB,
  };
}

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
  /** 성별 매치 카테고리 보정 배율(기본 1.0) — singlesGenderMultiplier/doublesGenderMultiplier 참고. */
  genderMultiplier?: number;
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
  const { ratingA, ratingB, gamesPlayedA, gamesPlayedB, gameScoreA, gameScoreB, resultForA, genderMultiplier = 1.0 } =
    input;

  const expectedA = expectedScore(ratingA, ratingB);
  const actualA = outcomeScore(resultForA);
  const kFactor = kFactorFor(Math.min(gamesPlayedA, gamesPlayedB));

  const winnerRating = resultForA === "LOSS" ? ratingB : ratingA;
  const loserRating = resultForA === "LOSS" ? ratingA : ratingB;
  const mov = movMultiplier(gameScoreA, gameScoreB, winnerRating, loserRating);

  // 0에 -1을 곱하면 -0이 나와 이후 정수 비교/직렬화에서 미묘한 문제를 일으킬 수 있으므로 정규화한다.
  const deltaA = Math.round(kFactor * mov * genderMultiplier * (actualA - expectedA)) || 0;

  return { deltaA, deltaB: deltaA === 0 ? 0 : -deltaA, expectedA, kFactor, movMultiplier: mov };
}

export function calculateSinglesElo(
  ratingA: number,
  gamesPlayedA: number,
  ratingB: number,
  gamesPlayedB: number,
  gameScoreA: number,
  gameScoreB: number,
  resultForA: MatchOutcome,
  genderMultiplier = 1.0
): { ratingA: number; ratingB: number } & EloMatchResult {
  const eloChange = calculateEloChange({
    ratingA,
    ratingB,
    gamesPlayedA,
    gamesPlayedB,
    gameScoreA,
    gameScoreB,
    resultForA,
    genderMultiplier,
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

// 팀 델타를 팀원 개인 레이팅 차이에 따라 차등 배분할 때 쓰는 보정 계수.
const DOUBLES_INDIVIDUAL_WEIGHT_ALPHA = 1.0;
// 레이팅 격차를 정규화하는 기준값 — expectedScore()의 /400과 같은 기준을
// 쓴다. 예전엔 팀 평균 레이팅(1200~1600대)으로 나눴는데, 그러면 흔한
// 격차(100~150점)가 평균 대비 겨우 8~12%로 작게 취급돼 가중치 차이가
// 1~2%밖에 안 나고, 그 결과 delta 10~20 같은 흔한 팀 델타에서는 0.x점
// 차이가 정수 반올림에 묻혀 둘 다 완전히 같은 값으로 나오는 버그가 있었다
// (예: 140점 격차 + 팀 델타 10 -> 실제로는 둘 다 +10으로 반올림됨).
const DOUBLES_GAP_REFERENCE = 400;

/**
 * 복식 팀 델타(BaseDelta — 팀 평균 레이팅 기준으로 산출된 값)를 팀원 개인
 * 레이팅 편차에 따라 차등 배분한다(Weighted Individual Delta).
 *
 *   Diff_i      = Rating_i - Team_Avg
 *   Weight_i    = 1.0 - alpha * Diff_i / 400   (승리/이득 시 — 하위 랭커일수록 Weight 커짐)
 *   Weight_i    = 1.0 + alpha * Diff_i / 400   (패배/손실 시 — 상위 랭커일수록 Weight 커짐)
 *   FinalDelta_i = round(BaseDelta * 2 * Weight_i / Weight_Sum)
 *
 * - 팀이 점수를 얻는 상황(teamDelta > 0)이면 팀 평균보다 레이팅이 낮은
 *   하위 랭커가 더 많이 얻는다(리스크를 더 짊어졌으므로).
 * - 팀이 점수를 잃는 상황(teamDelta < 0)이면 팀 평균보다 레이팅이 높은
 *   상위 랭커가 더 많이 잃는다(책임이 더 크므로).
 * 두 사람에게 배분된 값의 합은 항상 BaseDelta*2(=teamDelta*2)로 보존된다 —
 * 팀원 2번째 값은 공식으로 독립 반올림하지 않고 "합계 - 1번째 값"으로 구해서
 * 반올림 오차로 팀 전체 이동량이 어긋나지 않게 한다.
 */
export function distributeDoublesDelta(
  ratings: [number, number],
  teamDelta: number,
  alpha: number = DOUBLES_INDIVIDUAL_WEIGHT_ALPHA
): [number, number] {
  const [rating1, rating2] = ratings;
  const baseDelta = teamDelta;
  if (baseDelta === 0) return [baseDelta, baseDelta];
  const teamAvg = (rating1 + rating2) / 2;

  const isGain = baseDelta > 0;
  // 음수 가중치(극단적인 레이팅 격차)로 배분 방향이 뒤집히지 않도록 0 이상으로 고정한다.
  const weightOf = (rating: number) => {
    const diff = rating - teamAvg;
    const raw = isGain ? 1.0 - (alpha * diff) / DOUBLES_GAP_REFERENCE : 1.0 + (alpha * diff) / DOUBLES_GAP_REFERENCE;
    return Math.max(0, raw);
  };

  const weight1 = weightOf(rating1);
  const weight2 = weightOf(rating2);
  const weightSum = weight1 + weight2;
  if (weightSum === 0) return [baseDelta, baseDelta];

  const delta1 = Math.round((baseDelta * 2 * weight1) / weightSum);
  const delta2 = baseDelta * 2 - delta1; // 나머지를 그대로 배정해 합을 정확히 보존한다.
  return [delta1, delta2];
}

/**
 * 팀 레이팅은 두 선수 레이팅의 평균으로 계산해 팀 단위 델타를 산출한 뒤,
 * distributeDoublesDelta로 개인 레이팅에 따라 차등 배분해 각 선수에게 적용한다.
 */
export function calculateDoublesElo(
  teamA: [PlayerEloInput, PlayerEloInput],
  teamB: [PlayerEloInput, PlayerEloInput],
  gameScoreA: number,
  gameScoreB: number,
  resultForTeamA: MatchOutcome,
  genderMultiplier = 1.0
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
    genderMultiplier,
  });

  const [teamADelta1, teamADelta2] = distributeDoublesDelta(
    [teamA[0].rating, teamA[1].rating],
    eloChange.deltaA
  );
  const [teamBDelta1, teamBDelta2] = distributeDoublesDelta(
    [teamB[0].rating, teamB[1].rating],
    eloChange.deltaB
  );

  return {
    teamA: [teamA[0].rating + teamADelta1, teamA[1].rating + teamADelta2],
    teamB: [teamB[0].rating + teamBDelta1, teamB[1].rating + teamBDelta2],
    ...eloChange,
  };
}
