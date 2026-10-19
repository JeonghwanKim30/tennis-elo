import { describe, expect, it } from "vitest";
import {
  buildEventSlots,
  formatMinutes,
  parseTimeToMinutes,
  playerIdsBusyInSlot,
  slotCountFor,
} from "./eventSchedule";

describe("parseTimeToMinutes", () => {
  it("parses HH:MM", () => {
    expect(parseTimeToMinutes("15:00")).toBe(900);
    expect(parseTimeToMinutes("9:30")).toBe(570);
    expect(parseTimeToMinutes("00:00")).toBe(0);
  });

  it("rejects malformed or out-of-range values", () => {
    expect(parseTimeToMinutes(null)).toBeNull();
    expect(parseTimeToMinutes("")).toBeNull();
    expect(parseTimeToMinutes("25:00")).toBeNull();
    expect(parseTimeToMinutes("15:60")).toBeNull();
    expect(parseTimeToMinutes("오후 3시")).toBeNull();
  });
});

describe("formatMinutes", () => {
  it("pads to HH:MM and keeps past-midnight hours unfolded", () => {
    expect(formatMinutes(900)).toBe("15:00");
    expect(formatMinutes(570)).toBe("09:30");
    // 자정을 넘긴 슬롯이 "01:00"으로 접히면 앞 슬롯보다 빠른 시각처럼 보인다.
    expect(formatMinutes(25 * 60)).toBe("25:00");
  });
});

describe("slotCountFor", () => {
  it("divides matches across courts, rounding up", () => {
    expect(slotCountFor(12, 3)).toBe(4);
    expect(slotCountFor(10, 3)).toBe(4); // 마지막 라운드는 코트가 남는다
    expect(slotCountFor(2, 3)).toBe(1);
  });

  it("returns 0 for degenerate input", () => {
    expect(slotCountFor(0, 3)).toBe(0);
    expect(slotCountFor(12, 0)).toBe(0);
  });

  // 이벤트 생성 폼이 "코트 수 x 라운드 수"로 총 경기 수를 만들므로, 그 값을
  // 되돌리면 입력한 라운드 수가 정확히 나와야 한다(남는 코트 없이 꽉 찬 라운드).
  it("round-trips the 코트 수 × 라운드 수 formula exactly", () => {
    for (const courts of [1, 2, 3, 4, 8]) {
      for (const rounds of [1, 3, 5, 12]) {
        expect(slotCountFor(courts * rounds, courts)).toBe(rounds);
      }
    }
  });
});

describe("buildEventSlots", () => {
  it("splits 15:00~19:00 into 4 hourly slots for 12 matches on 3 courts", () => {
    const slots = buildEventSlots({
      startTime: "15:00",
      endTime: "19:00",
      plannedMatchCount: 12,
      courtCount: 3,
    });
    expect(slots.map((s) => s.rangeLabel)).toEqual([
      "15:00~16:00",
      "16:00~17:00",
      "17:00~18:00",
      "18:00~19:00",
    ]);
    expect(slots.map((s) => s.index)).toEqual([0, 1, 2, 3]);
  });

  it("handles a span that does not divide evenly", () => {
    const slots = buildEventSlots({
      startTime: "15:00",
      endTime: "16:30",
      plannedMatchCount: 4,
      courtCount: 2,
    });
    expect(slots.map((s) => s.rangeLabel)).toEqual(["15:00~15:45", "15:45~16:30"]);
  });

  it("wraps past midnight instead of producing a negative span", () => {
    const slots = buildEventSlots({
      startTime: "22:00",
      endTime: "01:00",
      plannedMatchCount: 3,
      courtCount: 1,
    });
    expect(slots.map((s) => s.rangeLabel)).toEqual(["22:00~23:00", "23:00~24:00", "24:00~25:00"]);
  });

  it("still produces slots when the event has no usable time range", () => {
    const slots = buildEventSlots({
      startTime: null,
      endTime: null,
      plannedMatchCount: 4,
      courtCount: 2,
    });
    expect(slots.map((s) => s.rangeLabel)).toEqual(["1번째 시간대", "2번째 시간대"]);
    expect(slots.every((s) => s.startLabel === "")).toBe(true);
  });

  it("returns nothing when there is no match count or court", () => {
    expect(buildEventSlots({ plannedMatchCount: 0, courtCount: 3 })).toEqual([]);
    expect(buildEventSlots({ plannedMatchCount: 12, courtCount: 0 })).toEqual([]);
  });
});

describe("playerIdsBusyInSlot", () => {
  const matches = [
    { id: "m1", slotIndex: 0, teamAPlayer1: "a", teamAPlayer2: "b", teamBPlayer1: "c", teamBPlayer2: "d" },
    { id: "m2", slotIndex: 0, teamAPlayer1: "e", teamAPlayer2: "f", teamBPlayer1: "g", teamBPlayer2: null },
    { id: "m3", slotIndex: 1, teamAPlayer1: "a", teamAPlayer2: "e", teamBPlayer1: "h", teamBPlayer2: "i" },
    { id: "m4", slotIndex: null, teamAPlayer1: "z", teamAPlayer2: null, teamBPlayer1: "y", teamBPlayer2: null },
  ];

  it("collects every player placed in that slot across all courts", () => {
    expect(playerIdsBusyInSlot(matches, 0)).toEqual(new Set(["a", "b", "c", "d", "e", "f", "g"]));
    expect(playerIdsBusyInSlot(matches, 1)).toEqual(new Set(["a", "e", "h", "i"]));
  });

  it("ignores matches that are not placed in a slot yet", () => {
    expect(playerIdsBusyInSlot(matches, 0).has("z")).toBe(false);
  });

  it("excludes the match being edited so its own players stay selectable", () => {
    expect(playerIdsBusyInSlot(matches, 0, "m1")).toEqual(new Set(["e", "f", "g"]));
  });

  it("returns an empty set for an untouched slot", () => {
    expect(playerIdsBusyInSlot(matches, 9)).toEqual(new Set());
  });
});
