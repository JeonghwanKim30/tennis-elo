import { describe, expect, it } from "vitest";
import {
  calculateDoublesElo,
  calculateEloChange,
  calculateSinglesElo,
  expectedScore,
  kFactorFor,
  movMultiplier,
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

describe("calculateDoublesElo", () => {
  it("applies the same delta to both players on a team, based on team average rating", () => {
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
    const { teamA, teamB } = calculateDoublesElo(
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
    const deltaA = teamA[0] - 1500;
    const deltaB = 1300 - teamB[0];
    expect(deltaA).toBeCloseTo(deltaB);
    expect(deltaA).toBeLessThan(18); // favored winner gains less than an even match would
  });
});
