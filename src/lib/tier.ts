// 리그 오브 레전드 스타일 티어 시스템 — 우리 앱의 ELO(초기 1200, 가변
// K-Factor + MOV 적용, lib/elo.ts) 점수 구간에 맞춰 8단계 티어를 매긴다.
// 리더보드/프로필/경기 상세 등 앱 전역에서 이 하나의 유틸리티를 공유한다.

import { PROVISIONAL_GAMES_THRESHOLD } from "./elo";

export type TierKey =
  | "IRON"
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "DIAMOND"
  | "MASTER"
  | "CHALLENGER";

export interface Tier {
  key: TierKey;
  label: string;
  /** 배지 배경/포인트 색상. */
  color: string;
  /** color 위에서 읽기 좋도록 자동 계산한 글자색(흰/검). */
  textColor: string;
  /** 티어 간 승급/강등 비교용 순위 — 0(아이언) ~ 7(챌린저). */
  rank: number;
}

interface TierDef {
  key: TierKey;
  min: number;
  label: string;
  color: string;
}

// min 기준 내림차순으로 정의 — 위에서부터 처음 만족하는 항목이 해당 티어다.
const TIER_DEFS: TierDef[] = [
  { key: "CHALLENGER", min: 1900, label: "챌린저", color: "#FF4500" },
  { key: "MASTER", min: 1750, label: "마스터", color: "#9932CC" },
  { key: "DIAMOND", min: 1600, label: "다이아몬드", color: "#00BFFF" },
  { key: "PLATINUM", min: 1450, label: "플래티넘", color: "#2E8B57" },
  { key: "GOLD", min: 1300, label: "골드", color: "#D4AF37" },
  { key: "SILVER", min: 1150, label: "실버", color: "#8A9EA7" },
  { key: "BRONZE", min: 1000, label: "브론즈", color: "#A57164" },
  { key: "IRON", min: -Infinity, label: "아이언", color: "#8C8C8C" },
];

// 배경색의 상대 휘도를 근사 계산해 흰/검 텍스트 중 대비가 더 좋은 쪽을 고른다
// (예: 밝은 골드/다이아몬드는 어두운 글자, 어두운 아이언/마스터는 흰 글자).
function contrastTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1f2937" : "#ffffff";
}

function buildTier(def: TierDef, index: number): Tier {
  return {
    key: def.key,
    label: def.label,
    color: def.color,
    textColor: contrastTextColor(def.color),
    rank: TIER_DEFS.length - 1 - index,
  };
}

export function getTier(rating: number): Tier {
  const index = TIER_DEFS.findIndex((t) => rating >= t.min);
  return buildTier(TIER_DEFS[index === -1 ? TIER_DEFS.length - 1 : index], index === -1 ? TIER_DEFS.length - 1 : index);
}

export function getTierByKey(key: TierKey): Tier {
  const index = TIER_DEFS.findIndex((t) => t.key === key);
  return buildTier(TIER_DEFS[index], index);
}

export function isTierKey(value: string): value is TierKey {
  return TIER_DEFS.some((t) => t.key === value);
}

const TIER_ORDER: TierKey[] = [
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "DIAMOND",
  "MASTER",
  "CHALLENGER",
];

export interface TierRange {
  tier: Tier;
  min: number;
  max: number | null;
}

/** 아이언→챌린저 순으로 전체 티어와 ELO 점수 구간을 반환한다(티어 안내 모달용). */
export function getAllTierRanges(): TierRange[] {
  return TIER_ORDER.map((key, i) => {
    const def = TIER_DEFS.find((d) => d.key === key)!;
    const nextDef = i < TIER_ORDER.length - 1 ? TIER_DEFS.find((d) => d.key === TIER_ORDER[i + 1])! : null;
    return { tier: getTierByKey(key), min: def.min, max: nextDef ? nextDef.min - 1 : null };
  });
}

// 완료 경기 수(승+패+무)가 배치 기준(5경기) 미만이면 아직 "배치 중" — 정식
// 랭킹/티어를 부여하지 않고 리더보드/프로필에 별도 표시(PlacementBadge)한다.
export function isPlacement(totalMatches: number): boolean {
  return totalMatches < PROVISIONAL_GAMES_THRESHOLD;
}

export interface RankableRow {
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

/**
 * 리더보드 정렬 비교 함수: 배치 완료자(총 경기 ≥5)를 항상 먼저(레이팅
 * 내림차순), 배치 진행 중인 유저는 그 뒤에 경기 수 많은 순 → 레이팅
 * 내림차순으로 배치한다. 0전 0패(1200점) 신규 유저가 실제로 경기를 뛰어
 * 점수가 내려간 유저보다 상위에 노출되는 문제를 막는다.
 */
export function compareForRanking(a: RankableRow, b: RankableRow): number {
  const totalA = a.wins + a.losses + a.draws;
  const totalB = b.wins + b.losses + b.draws;
  const placementA = isPlacement(totalA);
  const placementB = isPlacement(totalB);
  if (placementA !== placementB) return placementA ? 1 : -1;
  if (placementA && totalA !== totalB) return totalB - totalA;
  return b.rating - a.rating;
}

export interface TierChange {
  direction: "UP" | "DOWN";
  from: Tier;
  to: Tier;
}

/** 이전에 마지막으로 본 티어(key, DB에 저장된 문자열)와 지금의 티어를 비교한다.
 *  이전 기록이 없거나(첫 방문) 티어가 그대로면 null — 알릴 변화가 없다는 뜻. */
export function compareTierChange(previousKey: string | null | undefined, current: Tier): TierChange | null {
  if (!previousKey || !isTierKey(previousKey)) return null;
  const from = getTierByKey(previousKey);
  if (from.key === current.key) return null;
  return { direction: current.rank > from.rank ? "UP" : "DOWN", from, to: current };
}
