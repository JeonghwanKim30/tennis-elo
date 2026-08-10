import { describe, expect, it } from "vitest";
import { isPlacement, compareForRanking, type RankableRow } from "./tier";

describe("isPlacement", () => {
  it("is true while completed matches are below 5", () => {
    expect(isPlacement(0)).toBe(true);
    expect(isPlacement(4)).toBe(true);
  });

  it("is false once 5 or more matches are completed", () => {
    expect(isPlacement(5)).toBe(false);
    expect(isPlacement(10)).toBe(false);
  });
});

describe("compareForRanking", () => {
  function row(rating: number, wins: number, losses = 0, draws = 0): RankableRow {
    return { rating, wins, losses, draws };
  }

  it("ranks a placement user (0전) below a ranked user with a lower rating", () => {
    // 버그 리포트 시나리오: 0승0패(1200점) 신규 유저가 실전으로 점수가
    // 내려간(1163점) 배치 완료 유저보다 위로 가면 안 된다.
    const rows = [row(1200, 0, 0, 0), row(1163, 3, 7, 0)];
    rows.sort(compareForRanking);
    expect(rows[0].rating).toBe(1163);
    expect(rows[1].rating).toBe(1200);
  });

  it("sorts ranked users by rating descending", () => {
    const rows = [row(1300, 5, 2), row(1450, 6, 1)];
    rows.sort(compareForRanking);
    expect(rows.map((r) => r.rating)).toEqual([1450, 1300]);
  });

  it("ranks a placement user with 5+ total matches (via draws) as no longer placement", () => {
    const rows = [row(1210, 2, 0), row(1400, 4, 1)]; // 두 번째는 4승1무 = 5경기 -> 배치 아님
    rows.sort(compareForRanking);
    expect(rows[0].rating).toBe(1400); // 배치 완료자가 항상 먼저
  });

  it("within the placement group, more completed matches ranks higher", () => {
    const rows = [row(1210, 2, 0), row(1180, 4, 0)];
    rows.sort(compareForRanking);
    expect(rows[0].rating).toBe(1180); // 4경기 > 2경기
    expect(rows[1].rating).toBe(1210);
  });

  it("within the placement group with equal match counts, higher rating ranks higher", () => {
    const rows = [row(1180, 2, 0), row(1220, 1, 1)];
    rows.sort(compareForRanking);
    expect(rows[0].rating).toBe(1220);
    expect(rows[1].rating).toBe(1180);
  });
});
