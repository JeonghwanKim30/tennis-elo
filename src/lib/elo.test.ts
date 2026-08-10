import { describe, expect, it } from "vitest";
import {
  applyCrossGenderSinglesBonus,
  calculateDoublesElo,
  calculateEloChange,
  calculateSinglesElo,
  distributeDoublesDelta,
  expectedScore,
  femaleBonusPoints,
  isCrossGenderSingles,
  kFactorFor,
  movMultiplier,
  outcomeFromScores,
  resolveTargetScore,
} from "./elo";

describe("expectedScore", () => {
  it("returns 0.5 for equal ratings", () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5);
  });

  it("favors the higher-rated player", () => {
    expect(expectedScore(1400, 1200)).toBeGreaterThan(0.5);
    expect(expectedScore(1200, 1400)).toBeLessThan(0.5);
  });
});

describe("kFactorFor", () => {
  it("uses the provisional K while a player has 5 or fewer games", () => {
    expect(kFactorFor(0)).toBe(32);
    expect(kFactorFor(5)).toBe(32);
  });

  it("uses the established K once a player has more than 5 games", () => {
    expect(kFactorFor(6)).toBe(24);
    expect(kFactorFor(50)).toBe(24);
  });
});

describe("movMultiplier", () => {
  it("is clamped to 1.0 for a tied game score", () => {
    expect(movMultiplier(6, 6, 1200, 1200)).toBeCloseTo(1.0);
  });

  it("grows with a bigger game-score gap between equally rated players", () => {
    const close = movMultiplier(6, 4, 1200, 1200);
    const blowout = movMultiplier(6, 0, 1200, 1200);
    expect(blowout).toBeGreaterThan(close);
    expect(close).toBeCloseTo(Math.log(3));
  });

  it("dampens the multiplier when the higher-rated player wins as expected", () => {
    const expected = movMultiplier(6, 4, 1600, 1200); // winner rated well above loser
    expect(expected).toBeCloseTo(1.0); // raw value < 1, clamped up
  });

  it("amplifies the multiplier for an upset (lower-rated player wins)", () => {
    const upset = movMultiplier(6, 4, 1200, 1600); // winner rated well below loser
    expect(upset).toBeGreaterThan(Math.log(3));
  });
});

describe("calculateEloChange", () => {
  it("applies the provisional K-Factor (<=5 games) for an even match", () => {
    const { deltaA, deltaB } = calculateEloChange({
      ratingA: 1200,
      ratingB: 1200,
      gamesPlayedA: 0,
      gamesPlayedB: 0,
      gameScoreA: 6,
      gameScoreB: 4,
      resultForA: "WIN",
    });
    expect(deltaA).toBe(18);
    expect(deltaB).toBe(-18);
  });

  it("applies the established K-Factor (>5 games) for the same even match", () => {
    const { deltaA } = calculateEloChange({
      ratingA: 1200,
      ratingB: 1200,
      gamesPlayedA: 6,
      gamesPlayedB: 6,
      gameScoreA: 6,
      gameScoreB: 4,
      resultForA: "WIN",
    });
    expect(deltaA).toBe(13);
  });

  it("uses the lower of the two players' game counts to pick K", () => {
    // One side still provisional (0 games) even though the other is established (20 games)
    // should keep the whole match at the provisional K.
    const { deltaA } = calculateEloChange({
      ratingA: 1200,
      ratingB: 1200,
      gamesPlayedA: 0,
      gamesPlayedB: 20,
      gameScoreA: 6,
      gameScoreB: 4,
      resultForA: "WIN",
    });
    expect(deltaA).toBe(18);
  });

  it("awards fewer points for an expected win against a much lower-rated opponent", () => {
    const { deltaA } = calculateEloChange({
      ratingA: 1600,
      ratingB: 1200,
      gamesPlayedA: 0,
      gamesPlayedB: 0,
      gameScoreA: 6,
      gameScoreB: 4,
      resultForA: "WIN",
    });
    expect(deltaA).toBe(3);
  });

  it("awards more points for an upset win against a much higher-rated opponent", () => {
    const { deltaA } = calculateEloChange({
      ratingA: 1200,
      ratingB: 1600,
      gamesPlayedA: 0,
      gamesPlayedB: 0,
      gameScoreA: 6,
      gameScoreB: 4,
      resultForA: "WIN",
    });
    expect(deltaA).toBe(39);
  });

  it("gives a bigger swing for a lopsided score than a close one, all else equal", () => {
    const close = calculateEloChange({
      ratingA: 1200,
      ratingB: 1200,
      gamesPlayedA: 0,
      gamesPlayedB: 0,
      gameScoreA: 6,
      gameScoreB: 4,
      resultForA: "WIN",
    });
    const blowout = calculateEloChange({
      ratingA: 1200,
      ratingB: 1200,
      gamesPlayedA: 0,
      gamesPlayedB: 0,
      gameScoreA: 6,
      gameScoreB: 0,
      resultForA: "WIN",
    });
    expect(blowout.deltaA).toBeGreaterThan(close.deltaA);
  });

  it("keeps ratings unchanged on a draw between equally rated players", () => {
    const { deltaA, deltaB } = calculateEloChange({
      ratingA: 1200,
      ratingB: 1200,
      gamesPlayedA: 0,
      gamesPlayedB: 0,
      gameScoreA: 6,
      gameScoreB: 6,
      resultForA: "DRAW",
    });
    expect(deltaA).toBe(0);
    expect(deltaB).toBe(0);
  });
});

describe("calculateSinglesElo", () => {
  it("adds the delta to the winner and subtracts it from the loser", () => {
    const result = calculateSinglesElo(1200, 0, 1200, 0, 6, 4, "WIN");
    expect(result.ratingA).toBe(1218);
    expect(result.ratingB).toBe(1182);
  });
});

describe("isCrossGenderSingles", () => {
  it("is true only when the two singles players' genders differ", () => {
    expect(isCrossGenderSingles("MALE", "FEMALE")).toBe(true);
    expect(isCrossGenderSingles("FEMALE", "MALE")).toBe(true);
    expect(isCrossGenderSingles("MALE", "MALE")).toBe(false);
    expect(isCrossGenderSingles("FEMALE", "FEMALE")).toBe(false);
  });
});

describe("resolveTargetScore", () => {
  it("picks the higher of the two scores as the winning target", () => {
    expect(resolveTargetScore(3, 5)).toBe(5);
    expect(resolveTargetScore(4, 3)).toBe(4);
  });

  it("falls back to the tied score on a draw", () => {
    expect(resolveTargetScore(3, 3)).toBe(3);
  });
});

describe("femaleBonusPoints", () => {
  it("gives no bonus for a 1점 내기(sudden-death) match", () => {
    expect(femaleBonusPoints(1)).toBe(0);
  });

  it("gives +1 for a 2~4점 내기 match", () => {
    expect(femaleBonusPoints(2)).toBe(1);
    expect(femaleBonusPoints(4)).toBe(1);
  });

  it("gives +2 for a 5점 이상 내기 match", () => {
    expect(femaleBonusPoints(5)).toBe(2);
    expect(femaleBonusPoints(11)).toBe(2);
  });
});

describe("applyCrossGenderSinglesBonus", () => {
  it("leaves scores untouched for a same-gender singles match", () => {
    expect(applyCrossGenderSinglesBonus(3, 5, "MALE", "MALE")).toEqual({ scoreA: 3, scoreB: 5 });
    expect(applyCrossGenderSinglesBonus(3, 5, "FEMALE", "FEMALE")).toEqual({ scoreA: 3, scoreB: 5 });
  });

  it("adds the bonus to whichever side is FEMALE, regardless of A/B position", () => {
    // 3:5 -> targetScore 5 -> bonus +2, female is side B
    expect(applyCrossGenderSinglesBonus(3, 5, "MALE", "FEMALE")).toEqual({ scoreA: 3, scoreB: 7 });
    // same match, female is side A instead
    expect(applyCrossGenderSinglesBonus(5, 3, "FEMALE", "MALE")).toEqual({ scoreA: 7, scoreB: 3 });
  });

  it("applies no bonus for a 1점 내기 mixed match", () => {
    expect(applyCrossGenderSinglesBonus(0, 1, "MALE", "FEMALE")).toEqual({ scoreA: 0, scoreB: 1 });
  });

  it("applies +1 for a 4점 내기 mixed match", () => {
    expect(applyCrossGenderSinglesBonus(3, 4, "MALE", "FEMALE")).toEqual({ scoreA: 3, scoreB: 5 });
  });
});

describe("outcomeFromScores", () => {
  it("judges WIN/LOSS/DRAW purely from the two scores", () => {
    expect(outcomeFromScores(5, 4)).toBe("WIN");
    expect(outcomeFromScores(4, 5)).toBe("LOSS");
    expect(outcomeFromScores(3, 3)).toBe("DRAW");
  });

  it("flips to LOSS once a bonus-adjusted score overtakes the raw leader (5:4 -> 5:6)", () => {
    // 이게 이번에 고친 버그의 핵심 시나리오: 원 스코어는 5:4로 A가 앞섰지만,
    // 보너스(+2)가 더해진 6이 A의 5를 넘어서면 ELO 판정은 A의 LOSS가 되어야 한다.
    const { scoreA, scoreB } = applyCrossGenderSinglesBonus(5, 4, "MALE", "FEMALE");
    expect(outcomeFromScores(scoreA, scoreB)).toBe("LOSS");
  });
});

describe("distributeDoublesDelta", () => {
  it("splits evenly when both teammates have the same rating", () => {
    expect(distributeDoublesDelta([1200, 1200], 16)).toEqual([16, 16]);
  });

  it("returns [0, 0] when the team delta is zero", () => {
    expect(distributeDoublesDelta([1400, 1000], 0)).toEqual([0, 0]);
  });

  it("on a gain (win), gives the below-average teammate more and the above-average teammate less", () => {
    const [aboveAvg, belowAvg] = distributeDoublesDelta([1400, 1000], 20);
    expect(aboveAvg).toBeLessThan(20);
    expect(belowAvg).toBeGreaterThan(20);
    expect(aboveAvg).toBe(19);
    expect(belowAvg).toBe(21);
    expect(aboveAvg + belowAvg).toBe(40); // 팀 델타*2로 합 보존
  });

  it("on a loss, makes the above-average teammate lose more and the below-average teammate lose less", () => {
    const [aboveAvg, belowAvg] = distributeDoublesDelta([1400, 1000], -20);
    expect(aboveAvg).toBeLessThan(belowAvg); // 더 많이 잃음(더 음수)
    expect(aboveAvg).toBe(-21);
    expect(belowAvg).toBe(-19);
    expect(aboveAvg + belowAvg).toBe(-40);
  });
});

describe("calculateDoublesElo", () => {
  it("applies the same delta to both players on a team when they're equally rated", () => {
    const { teamA, teamB } = calculateDoublesElo(
      [
        { rating: 1200, gamesPlayed: 0 },
        { rating: 1200, gamesPlayed: 0 },
      ],
      [
        { rating: 1200, gamesPlayed: 0 },
        { rating: 1200, gamesPlayed: 0 },
      ],
      6,
      4,
      "WIN"
    );
    expect(teamA[0]).toBe(teamA[1]);
    expect(teamB[0]).toBe(teamB[1]);
    expect(teamA[0]).toBe(1218);
    expect(teamB[0]).toBe(1182);
  });

  it("uses each team's average rating to compute the expected score", () => {
    // Team A average (1400) vs Team B average (1200): A is favored, so a win nets less than an upset would.
    const { teamA, deltaA } = calculateDoublesElo(
      [
        { rating: 1500, gamesPlayed: 0 },
        { rating: 1300, gamesPlayed: 0 },
      ],
      [
        { rating: 1300, gamesPlayed: 0 },
        { rating: 1100, gamesPlayed: 0 },
      ],
      6,
      4,
      "WIN"
    );
    const teamAAvgDelta = ((teamA[0] - 1500) + (teamA[1] - 1300)) / 2;
    expect(teamAAvgDelta).toBeCloseTo(deltaA); // 개인별로 갈라져도 팀 평균 이동량은 그대로
    expect(deltaA).toBeLessThan(18); // favored winner gains less than an even match would
  });

  it("differentiates individual gains within the winning team by rating (lower-rated teammate gains more)", () => {
    const { teamA } = calculateDoublesElo(
      [
        { rating: 1400, gamesPlayed: 0 },
        { rating: 1000, gamesPlayed: 0 },
      ],
      [
        { rating: 1200, gamesPlayed: 0 },
        { rating: 1200, gamesPlayed: 0 },
      ],
      6,
      4,
      "WIN"
    );
    const higherRatedGain = teamA[0] - 1400;
    const lowerRatedGain = teamA[1] - 1000;
    expect(lowerRatedGain).toBeGreaterThan(higherRatedGain);
  });

  it("differentiates individual losses within the losing team by rating (higher-rated teammate loses more)", () => {
    const { teamB } = calculateDoublesElo(
      [
        { rating: 1200, gamesPlayed: 0 },
        { rating: 1200, gamesPlayed: 0 },
      ],
      [
        { rating: 1400, gamesPlayed: 0 },
        { rating: 1000, gamesPlayed: 0 },
      ],
      6,
      4,
      "WIN"
    );
    const higherRatedLoss = teamB[0] - 1400;
    const lowerRatedLoss = teamB[1] - 1000;
    expect(higherRatedLoss).toBeLessThan(lowerRatedLoss); // 더 많이 잃음(더 음수)
  });
});
