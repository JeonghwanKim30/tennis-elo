import { describe, expect, it } from "vitest";
import { calculateDoublesElo, calculateSinglesElo, expectedScore } from "./elo";

describe("expectedScore", () => {
  it("returns 0.5 for equal ratings", () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5);
  });

  it("favors the higher-rated player", () => {
    expect(expectedScore(1400, 1200)).toBeGreaterThan(0.5);
    expect(expectedScore(1200, 1400)).toBeLessThan(0.5);
  });
});

describe("calculateSinglesElo", () => {
  it("increases winner rating and decreases loser rating by equal magnitude for equal ratings", () => {
    const { ratingA, ratingB } = calculateSinglesElo(1200, 1200, "WIN");
    expect(ratingA).toBeCloseTo(1216);
    expect(ratingB).toBeCloseTo(1184);
    expect(ratingA - 1200).toBeCloseTo(1200 - ratingB);
  });

  it("keeps ratings unchanged on a draw between equal players", () => {
    const { ratingA, ratingB } = calculateSinglesElo(1200, 1200, "DRAW");
    expect(ratingA).toBeCloseTo(1200);
    expect(ratingB).toBeCloseTo(1200);
  });

  it("gives fewer points for an expected win against a much lower-rated player", () => {
    const { ratingA } = calculateSinglesElo(1600, 1200, "WIN");
    expect(ratingA - 1600).toBeLessThan(16);
  });

  it("gives more points for an upset win against a much higher-rated player", () => {
    const { ratingA } = calculateSinglesElo(1200, 1600, "WIN");
    expect(ratingA - 1200).toBeGreaterThan(16);
  });
});

describe("calculateDoublesElo", () => {
  it("applies the same delta to both players on a team", () => {
    const { teamA, teamB } = calculateDoublesElo([1200, 1200], [1200, 1200], "WIN");
    expect(teamA[0]).toBeCloseTo(teamA[1]);
    expect(teamB[0]).toBeCloseTo(teamB[1]);
    expect(teamA[0]).toBeCloseTo(1216);
    expect(teamB[0]).toBeCloseTo(1184);
  });

  it("uses team average rating to compute expected score", () => {
    // Team A average (1400) vs Team B average (1200): A is favored.
    const { teamA, teamB } = calculateDoublesElo([1500, 1300], [1300, 1100], "WIN");
    const deltaA = teamA[0] - 1500;
    const deltaB = 1300 - teamB[0];
    expect(deltaA).toBeLessThan(16); // favored winner gains less than base K/2
    expect(deltaA).toBeCloseTo(deltaB);
  });
});
