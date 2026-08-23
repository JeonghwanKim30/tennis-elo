// 경기일(MatchDay) 관련 "오늘/자정" 계산은 전부 한국 시간(KST, Asia/Seoul)
// 기준으로 고정한다. 서버가 어떤 타임존에서 돌든(대부분 UTC) Date의 로컬
// 타임존 메서드(getDate 등)나 toISOString()의 UTC 날짜를 그대로 쓰면 자정이
// 아니라 "한국 시간 오전 9시"에 날짜가 바뀌는 버그가 생긴다 — 그래서
// Intl.DateTimeFormat으로 KST 기준 연/월/일을 직접 뽑아낸다(서버 로컬
// 타임존/환경변수에 의존하지 않아 배포 환경이 바뀌어도 항상 정확하다).
const KST_TIME_ZONE = "Asia/Seoul";

/** 주어진 시각(기본: 지금)의 KST 기준 달력 날짜를 "YYYY-MM-DD"로 반환한다. */
export function kstDateString(instant: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * "YYYY-MM-DD" 달력 날짜 문자열을 MatchDay.date 저장 규칙과 동일한 UTC 자정
 * Date로 변환한다. 경기일 등록 폼(`<input type="date">`)이 이미 이 규칙으로
 * 저장하므로(날짜 전용 문자열은 스펙상 UTC 자정으로 파싱됨), "오늘" 비교도
 * 같은 규칙을 써야 두 값이 실제로 같은 날짜로 비교된다.
 */
export function dateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * KST 기준 "오늘"의 달력 날짜 — dateOnly()와 동일한 표현(UTC 자정)으로
 * 반환하므로 MatchDay.date 필드와 바로 비교/저장할 수 있다.
 */
export function kstToday(): Date {
  return dateOnly(kstDateString());
}
