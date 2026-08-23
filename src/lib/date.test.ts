import { describe, expect, it } from "vitest";
import { dateOnly, kstDateString, kstToday } from "./date";

describe("kstDateString", () => {
  it("returns the same calendar date when UTC and KST agree", () => {
    // 2026-01-01 09:30 KST == 2026-01-01 00:30 UTC — 같은 날짜.
    expect(kstDateString(new Date("2026-01-01T00:30:00.000Z"))).toBe("2026-01-01");
  });

  it("rolls over to the next KST calendar day before UTC midnight (the reported bug)", () => {
    // 2026-01-01 16:00 UTC == 2026-01-02 01:00 KST — UTC 기준으로는 여전히
    // 1/1이지만 한국 시간으로는 이미 1/2 자정을 넘겼다. 버그 수정 전에는 이
    // 시각에 "오늘"이 1/1로 계산돼(한국 시간 오전 9시가 되어야 날짜가
    // 바뀌는 문제) 다가오는/지난 경기 구분이 최대 9시간 어긋났다.
    expect(kstDateString(new Date("2026-01-01T16:00:00.000Z"))).toBe("2026-01-02");
  });

  it("stays on the previous KST calendar day just before KST midnight", () => {
    // 2026-01-01 14:59:59 UTC == 2026-01-01 23:59:59 KST.
    expect(kstDateString(new Date("2026-01-01T14:59:59.000Z"))).toBe("2026-01-01");
  });

  it("flips exactly at KST midnight (UTC 15:00 the previous day)", () => {
    // 2026-01-01 15:00:00 UTC == 2026-01-02 00:00:00 KST.
    expect(kstDateString(new Date("2026-01-01T15:00:00.000Z"))).toBe("2026-01-02");
  });
});

describe("dateOnly", () => {
  it("parses a YYYY-MM-DD string as UTC midnight", () => {
    const d = dateOnly("2026-03-05");
    expect(d.toISOString()).toBe("2026-03-05T00:00:00.000Z");
  });
});

describe("kstToday", () => {
  it("round-trips through kstDateString/dateOnly consistently", () => {
    const today = kstToday();
    expect(today.toISOString()).toBe(`${kstDateString()}T00:00:00.000Z`);
  });
});
