// 프로필에 표시되는 티어 배지 — 단식/복식 ELO 평균을 기준으로 매긴다.
// 리더보드의 순위(1/2/3등)와는 다른 개념으로, "지금 실력대가 어느 정도인지"를
// 한눈에 보여주는 절대적인 등급이다.
export interface Tier {
  label: string;
  badgeClassName: string;
}

const TIERS: (Tier & { min: number })[] = [
  { min: 1550, label: "다이아몬드", badgeClassName: "bg-sky-100 text-sky-700" },
  { min: 1400, label: "플래티넘", badgeClassName: "bg-teal-100 text-teal-700" },
  { min: 1250, label: "골드", badgeClassName: "bg-amber-100 text-amber-800" },
  { min: 1100, label: "실버", badgeClassName: "bg-gray-200 text-gray-600" },
  { min: -Infinity, label: "브론즈", badgeClassName: "bg-orange-100 text-orange-700" },
];

export function getTier(averageRating: number): Tier {
  const tier = TIERS.find((t) => averageRating >= t.min);
  return tier ?? TIERS[TIERS.length - 1];
}
