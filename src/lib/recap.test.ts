import { describe, expect, it } from "vitest";
import {
  computeLongestWinStreak,
  computeOpponentRecords,
  computePartnerRecords,
  computeRecapStats,
  type RecapMatchRecord,
} from "./recap";

function m(partial: Partial<RecapMatchRecord> & { outcome: RecapMatchRecord["outcome"] }): RecapMatchRecord {
  return {
    matchId: partial.matchId ?? `m${Math.random()}`,
    approvalSeq: partial.approvalSeq ?? 0,
    date: partial.date ?? new Date("2026-08-01"),
    type: partial.type ?? "SINGLES",
    outcome: partial.outcome,
    delta: partial.delta ?? 0,
    ratingAfter: partial.ratingAfter ?? 1200,
    opponentIds: partial.opponentIds ?? ["opp1"],
    teammateId: partial.teammateId ?? null,
  };
}

describe("computeLongestWinStreak", () => {
  it("returns 0 when there are no wins", () => {
    expect(computeLongestWinStreak([m({ outcome: "LOSS" }), m({ outcome: "DRAW" })])).toBe(0);
  });

  it("finds the longest run of consecutive wins, ignoring later shorter runs", () => {
    const matches = [
      m({ outcome: "WIN" }),
      m({ outcome: "WIN" }),
      m({ outcome: "WIN" }),
      m({ outcome: "LOSS" }),
      m({ outcome: "WIN" }),
    ];
    expect(computeLongestWinStreak(matches)).toBe(3);
  });

  it("a draw breaks the streak just like a loss", () => {
    const matches = [m({ outcome: "WIN" }), m({ outcome: "WIN" }), m({ outcome: "DRAW" }), m({ outcome: "WIN" })];
    expect(computeLongestWinStreak(matches)).toBe(2);
  });
});

describe("computeOpponentRecords / computePartnerRecords", () => {
  it("tallies wins/losses/draws per opponent with a rounded win rate", () => {
    const matches = [
      m({ outcome: "WIN", opponentIds: ["opp1"] }),
      m({ outcome: "WIN", opponentIds: ["opp1"] }),
      m({ outcome: "LOSS", opponentIds: ["opp1"] }),
    ];
    const records = computeOpponentRecords(matches);
    expect(records.get("opp1")).toEqual({
      playerId: "opp1",
      wins: 2,
      losses: 1,
      draws: 0,
      total: 3,
      winRate: 66.7,
    });
  });

  it("computePartnerRecords only counts matches actually played with each partner", () => {
    const matches = [
      m({ outcome: "WIN", teammateId: "a" }),
      m({ outcome: "LOSS", teammateId: "b" }),
      m({ outcome: "WIN", teammateId: "a" }),
    ];
    const records = computePartnerRecords(matches);
    expect(records.get("a")).toEqual({ playerId: "a", wins: 2, losses: 0, draws: 0, total: 2, winRate: 100 });
    expect(records.get("b")).toEqual({ playerId: "b", wins: 0, losses: 1, draws: 0, total: 1, winRate: 0 });
  });
});

describe("computeRecapStats", () => {
  it("returns the NO_RECORD title and zeroed stats when there are no matches", () => {
    const stats = computeRecapStats([]);
    expect(stats.totalMatches).toBe(0);
    expect(stats.peakElo).toBeNull();
    expect(stats.title.key).toBe("NO_RECORD");
  });

  it("sums elo delta and tracks the peak rating reached in the period", () => {
    const matches = [
      m({ outcome: "WIN", delta: 15, ratingAfter: 1215 }),
      m({ outcome: "LOSS", delta: -8, ratingAfter: 1207 }),
      m({ outcome: "WIN", delta: 20, ratingAfter: 1227 }),
    ];
    const stats = computeRecapStats(matches);
    expect(stats.eloChange).toBe(27);
    expect(stats.peakElo).toBe(1227);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.winRate).toBe(66.7);
  });

  it("awards WIN_STREAK_MASTER when the longest streak reaches the threshold, even if a combo also qualifies", () => {
    const matches = [
      m({ outcome: "WIN", type: "DOUBLES", teammateId: "buddy" }),
      m({ outcome: "WIN", type: "DOUBLES", teammateId: "buddy" }),
      m({ outcome: "WIN", type: "DOUBLES", teammateId: "buddy" }),
    ];
    // 콤비 조건(2경기 이상, 승률 70%+)도 만족하지만 연승(3연승)이 우선순위가 더 높다.
    expect(computeRecapStats(matches).title.key).toBe("WIN_STREAK_MASTER");
  });

  it("awards BEST_COMBO when the best-win-rate doubles partner qualifies, without a long streak", () => {
    const matches = [
      m({ outcome: "WIN", type: "DOUBLES", teammateId: "buddy" }),
      m({ outcome: "LOSS", type: "SINGLES", opponentIds: ["someone"] }),
      m({ outcome: "WIN", type: "DOUBLES", teammateId: "buddy" }),
    ];
    const stats = computeRecapStats(matches);
    expect(stats.title.key).toBe("BEST_COMBO");
    expect(stats.bestPartner?.playerId).toBe("buddy");
    expect(stats.bestPartner?.winRate).toBe(100);
  });

  it("picks the partner by win rate, not by how often they played together", () => {
    const matches = [
      // frequent(3경기, 33%)보다 occasional(2경기, 100%)의 승률이 더 높다.
      m({ outcome: "WIN", type: "DOUBLES", teammateId: "frequent" }),
      m({ outcome: "LOSS", type: "DOUBLES", teammateId: "frequent" }),
      m({ outcome: "LOSS", type: "DOUBLES", teammateId: "frequent" }),
      m({ outcome: "WIN", type: "DOUBLES", teammateId: "occasional" }),
      m({ outcome: "WIN", type: "DOUBLES", teammateId: "occasional" }),
    ];
    expect(computeRecapStats(matches).bestPartner?.playerId).toBe("occasional");
  });

  it("awards BLAZING_SINGLES for a strong singles-only record with no streak or combo", () => {
    const matches = [
      m({ outcome: "WIN", type: "SINGLES", opponentIds: ["a"] }),
      m({ outcome: "LOSS", type: "SINGLES", opponentIds: ["b"] }),
      m({ outcome: "WIN", type: "SINGLES", opponentIds: ["c"] }),
      m({ outcome: "WIN", type: "SINGLES", opponentIds: ["d"] }),
    ];
    expect(computeRecapStats(matches).title.key).toBe("BLAZING_SINGLES");
  });

  it("falls back to STEADY_PLAYER when no flashier title condition is met", () => {
    const matches = [m({ outcome: "WIN", opponentIds: ["a"] }), m({ outcome: "LOSS", opponentIds: ["b"] })];
    expect(computeRecapStats(matches).title.key).toBe("STEADY_PLAYER");
  });

  it("only reports a best/worst opponent (and partner) once a minimum match count is reached", () => {
    const matches = [
      m({ outcome: "WIN", opponentIds: ["onceOnly"] }),
      m({ outcome: "WIN", opponentIds: ["rival"] }),
      m({ outcome: "LOSS", opponentIds: ["rival"] }),
      m({ outcome: "LOSS", opponentIds: ["rival"] }),
    ];
    const stats = computeRecapStats(matches);
    expect(stats.bestOpponent?.playerId).toBe("rival");
    expect(stats.worstOpponent?.playerId).toBe("rival");
    expect(stats.worstOpponent?.winRate).toBe(33.3);
    expect(stats.bestPartner).toBeNull();
  });
});
