import { describe, expect, it } from "vitest";
import { generateDoublesSchedule, type SchedulerPlayer } from "./doublesScheduler";

// mulberry32 — 테스트가 매번 같은 결과를 내도록 고정 시드 PRNG를 쓴다.
function seededRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makePlayers(count: number, baseElo = 1300, step = 20): SchedulerPlayer[] {
  return Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, elo: baseElo - i * step }));
}

function appearanceCounts(matches: ReturnType<typeof generateDoublesSchedule>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of matches) {
    for (const id of [...m.teamA, ...m.teamB]) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

describe("generateDoublesSchedule", () => {
  it("throws when fewer than 4 players are given", () => {
    expect(() => generateDoublesSchedule(makePlayers(3), 2)).toThrow();
  });

  it("throws when matchCount is not a positive integer", () => {
    expect(() => generateDoublesSchedule(makePlayers(4), 0)).toThrow();
    expect(() => generateDoublesSchedule(makePlayers(4), 1.5)).toThrow();
  });

  it("evenly splits appearances when matches divide players exactly (8명/6경기)", () => {
    const matches = generateDoublesSchedule(makePlayers(8), 6, seededRng(1));
    expect(matches).toHaveLength(6);
    const counts = appearanceCounts(matches);
    expect(counts.size).toBe(8);
    for (const count of counts.values()) {
      expect(count).toBe(3);
    }
  });

  it("keeps appearance counts within ±1 when they don't divide evenly (7명/5경기)", () => {
    const matches = generateDoublesSchedule(makePlayers(7), 5, seededRng(2));
    const counts = appearanceCounts(matches);
    expect(counts.size).toBe(7);
    const values = Array.from(counts.values());
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
    expect(values.reduce((a, b) => a + b, 0)).toBe(5 * 4);
  });

  it("never repeats a player within the same match", () => {
    const matches = generateDoublesSchedule(makePlayers(9), 8, seededRng(3));
    for (const m of matches) {
      const ids = [...m.teamA, ...m.teamB];
      expect(new Set(ids).size).toBe(4);
    }
  });

  it("reports the correct ELO gap per match", () => {
    const players = makePlayers(4);
    const eloById = new Map(players.map((p) => [p.id, p.elo]));
    const matches = generateDoublesSchedule(players, 3, seededRng(4));
    for (const m of matches) {
      const sumA = m.teamA.reduce((s, id) => s + eloById.get(id)!, 0);
      const sumB = m.teamB.reduce((s, id) => s + eloById.get(id)!, 0);
      expect(m.eloDiff).toBe(Math.abs(sumA - sumB));
    }
  });

  it("minimizes team-partner repeats when enough players are available (8명/6경기)", () => {
    const matches = generateDoublesSchedule(makePlayers(8), 6, seededRng(5));
    const pairCounts = new Map<string, number>();
    for (const m of matches) {
      for (const team of [m.teamA, m.teamB]) {
        const key = [...team].sort().join(",");
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
    // 12개 팀 슬롯인데 가능한 페어 조합은 28가지라, 잘 풀리면 전부 서로 다른
    // 페어가 나올 수 있다 — 반복이 있어도 소수(2회 이하)에 그쳐야 한다.
    for (const count of pairCounts.values()) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it("stays internally consistent across many random player/match-count combinations", () => {
    for (let seed = 0; seed < 30; seed++) {
      const rng = seededRng(seed * 97 + 1);
      const playerCount = 4 + Math.floor(rng() * 12); // 4~15명
      const matchCount = 1 + Math.floor(rng() * 10); // 1~10경기
      const players = makePlayers(playerCount);

      const matches = generateDoublesSchedule(players, matchCount, rng);
      expect(matches).toHaveLength(matchCount);

      const counts = appearanceCounts(matches);
      const values = Array.from(counts.values());
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
      expect(values.reduce((a, b) => a + b, 0)).toBe(matchCount * 4);

      for (const m of matches) {
        expect(new Set([...m.teamA, ...m.teamB]).size).toBe(4);
      }
    }
  });
});
