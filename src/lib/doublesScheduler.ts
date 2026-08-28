export interface SchedulerPlayer {
  id: string;
  elo: number;
}

export interface ScheduledMatch {
  teamA: [string, string];
  teamB: [string, string];
  /** |teamA ELO 합 - teamB ELO 합| */
  eloDiff: number;
}

// 순서: ELO 밸런스를 중복 회피보다 우선한다(사용자 확정 사항) — 팀 중복 1건의
// 비용이 ELO차 몇 점 정도의 비용과 맞먹는지를 이 두 가중치의 비가 결정한다.
const WEIGHT_ELO = 1;
const WEIGHT_TEAM_DUP = 15;
// 그룹(매치업) 재시도 — 같은 4명이 다시 뭉치는 걸 되도록 피하되, 인원이 적어
// 불가피하면(모든 시도가 중복이면) 마지막 시도 결과를 그대로 쓴다.
const GROUP_RETRY_ATTEMPTS = 5;
// 팀 분할 재조정 스윕 횟수 — 한 바�퀴 돌아도 아무 매치의 분할이 안 바뀌면
// 수렴한 것으로 보고 더 일찍 멈춘다.
const REFINEMENT_PASSES = 8;

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 정렬 순서에 상관없이 같은 두 명/네 명을 같은 키로 묶기 위한 헬퍼.
// cuid는 콤마를 포함하지 않으므로 join 구분자로 안전하게 쓸 수 있다.
function pairKey(a: string, b: string): string {
  return a < b ? `${a},${b}` : `${b},${a}`;
}
function groupKey(ids: string[]): string {
  return [...ids].sort().join(",");
}

type Split = [[string, string], [string, string]];

function splitOptions(group: string[]): Split[] {
  const [a, b, c, d] = group;
  return [
    [
      [a, b],
      [c, d],
    ],
    [
      [a, c],
      [b, d],
    ],
    [
      [a, d],
      [b, c],
    ],
  ];
}

function eloDiffOf(teamA: string[], teamB: string[], eloById: Map<string, number>): number {
  const sumA = teamA.reduce((s, id) => s + eloById.get(id)!, 0);
  const sumB = teamB.reduce((s, id) => s + eloById.get(id)!, 0);
  return Math.abs(sumA - sumB);
}

/**
 * 참가자 ELO를 기반으로 복식 대진표(경기 N개)를 생성한다.
 *
 * 우선순위(관리자 확정 사항):
 * 1. 출전 횟수 균등화 — 전원 ±1경기 이내. 슬롯 풀 크기로 미리 못박아두는
 *    구조적 제약이라, 이후 어떤 최적화를 거쳐도 절대 깨지지 않는다.
 * 2. 팀 ELO 밸런스 — 각 경기 팀 ELO 합 차이를 최우선으로 최소화.
 * 3. 중복 회피 — 같은 2명이 다시 한 팀이 되거나(팀 중복), 같은 4명이 다시
 *    맞붙는(매치업 중복) 것을 최소화. 이번 생성 배치 안에서만 판단하며
 *    과거 DB 이력은 참조하지 않는다.
 */
export function generateDoublesSchedule(
  players: SchedulerPlayer[],
  matchCount: number,
  rng: () => number = Math.random
): ScheduledMatch[] {
  if (players.length < 4) {
    throw new Error("복식 대진표를 만들려면 참가자가 4명 이상이어야 합니다.");
  }
  if (!Number.isInteger(matchCount) || matchCount < 1) {
    throw new Error("생성할 경기 수는 1 이상의 정수여야 합니다.");
  }

  const eloById = new Map(players.map((p) => [p.id, p.elo]));
  const groups = allocateGroups(
    players.map((p) => p.id),
    matchCount,
    rng
  );
  const splits: Split[] = groups.map((g) => bestEloSplit(g, eloById));
  refineSplits(groups, splits, eloById, rng);

  return groups.map((group, i) => {
    const [teamA, teamB] = splits[i];
    return { teamA, teamB, eloDiff: eloDiffOf(teamA, teamB, eloById) };
  });
}

function bestEloSplit(group: string[], eloById: Map<string, number>): Split {
  let best = splitOptions(group)[0];
  let bestDiff = Infinity;
  for (const split of splitOptions(group)) {
    const diff = eloDiffOf(split[0], split[1], eloById);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = split;
    }
  }
  return best;
}

// 1단계 — 출전 횟수를 ±1로 균등화한 뒤, "남은 출전 목표가 가장 많이 남은
// 사람부터" 채우는 방식(largest-remaining-first)으로 매치마다 4명씩 배정한다.
// 목표 출전 횟수는 항상 matchCount 이하이므로(참가자 수 >= 4일 때 수학적으로
// 보장됨) 이 방식은 항상 4명을 채울 수 있다.
function allocateGroups(ids: string[], matchCount: number, rng: () => number): string[][] {
  const totalSlots = matchCount * 4;
  const base = Math.floor(totalSlots / ids.length);
  const remainder = totalSlots - base * ids.length;
  const shuffledIds = shuffle(ids, rng);
  const target = new Map<string, number>(shuffledIds.map((id, i) => [id, base + (i < remainder ? 1 : 0)]));

  const remaining = new Map(target);
  const groups: string[][] = [];
  const usedGroupKeys = new Set<string>();

  for (let m = 0; m < matchCount; m++) {
    let group: string[] | null = null;
    for (let attempt = 0; attempt < GROUP_RETRY_ATTEMPTS; attempt++) {
      const ordered = shuffle(
        ids.filter((id) => (remaining.get(id) ?? 0) > 0),
        rng
      ).sort((a, b) => (remaining.get(b) ?? 0) - (remaining.get(a) ?? 0));
      if (ordered.length < 4) {
        // target <= matchCount가 성립하는 한 이론상 발생하지 않는다.
        throw new Error("대진표 생성 실패 — 인원 구성을 확인해주세요.");
      }
      const candidate = ordered.slice(0, 4);
      if (!usedGroupKeys.has(groupKey(candidate)) || attempt === GROUP_RETRY_ATTEMPTS - 1) {
        group = candidate;
        break;
      }
    }
    usedGroupKeys.add(groupKey(group!));
    group!.forEach((id) => remaining.set(id, (remaining.get(id) ?? 0) - 1));
    groups.push(group!);
  }
  return groups;
}

// 2단계 — 어느 4명이 같은 경기에 뛰는지(groups)는 그대로 두고, 각 경기의 팀
// 분할(3가지 중 하나)만 여러 차례 스윕하며 다시 고른다(coordinate descent).
// 이번 배치 안의 다른 모든 경기의 "현재" 팀 구성을 기준으로 팀 중복 횟수를
// 세고, ELO 격차와 함께 비용이 가장 낮은 분할을 선택 — 어느 매치의 분할도
// 더 바뀌지 않으면(수렴) 중간에 멈춘다.
function refineSplits(
  groups: string[][],
  splits: Split[],
  eloById: Map<string, number>,
  rng: () => number
): void {
  const matchCount = groups.length;
  if (matchCount < 2) return;

  for (let pass = 0; pass < REFINEMENT_PASSES; pass++) {
    let changed = false;
    const order = shuffle(
      Array.from({ length: matchCount }, (_, i) => i),
      rng
    );

    for (const i of order) {
      const pairCount = new Map<string, number>();
      for (let j = 0; j < matchCount; j++) {
        if (j === i) continue;
        for (const team of splits[j]) {
          const key = pairKey(team[0], team[1]);
          pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
        }
      }

      let bestSplit = splits[i];
      let bestCost = Infinity;
      for (const split of splitOptions(groups[i])) {
        const diff = eloDiffOf(split[0], split[1], eloById);
        const dupA = pairCount.get(pairKey(split[0][0], split[0][1])) ?? 0;
        const dupB = pairCount.get(pairKey(split[1][0], split[1][1])) ?? 0;
        const cost = WEIGHT_ELO * diff * diff + WEIGHT_TEAM_DUP * (dupA * dupA + dupB * dupB);
        if (cost < bestCost) {
          bestCost = cost;
          bestSplit = split;
        }
      }

      if (bestSplit[0][0] !== splits[i][0][0] || bestSplit[0][1] !== splits[i][0][1]) {
        splits[i] = bestSplit;
        changed = true;
      }
    }

    if (!changed) break;
  }
}
