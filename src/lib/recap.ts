// 기간(월간/시즌) 리캡 카드 통계 계산 — 순수 함수 모음. DB 조회 결과를
// RecapMatchRecord[]로 변환한 뒤 여기 넘기면 카드에 필요한 모든 집계값을
// 만들어준다(테스트하기 쉽도록 Prisma/서버 액션과 완전히 분리해뒀다).

export type MatchOutcome = "WIN" | "LOSS" | "DRAW";
export type RecapMatchType = "SINGLES" | "DOUBLES";

export interface RecapMatchRecord {
  matchId: string;
  /** 정렬 기준 — approvalSeq 오름차순(=실제 경기 반영 순서)으로 넘겨야 연승 계산이 정확하다. */
  approvalSeq: number;
  date: Date;
  type: RecapMatchType;
  outcome: MatchOutcome;
  /** 이 경기에서 이 유저가 실제로 얻은 ELO 변동량(EloHistory.delta). */
  delta: number;
  /** 이 경기 이후의 레이팅(EloHistory.ratingAfter). */
  ratingAfter: number;
  /** 상대팀 선수 id 1~2명. */
  opponentIds: string[];
  /** 복식일 때 팀 동료 id, 단식이면 null. */
  teammateId: string | null;
}

export interface PlayerRecord {
  playerId: string;
  wins: number;
  losses: number;
  draws: number;
  total: number;
  /** 0~100, 소수 1자리. */
  winRate: number;
}

export type RecapTitleKey =
  | "WIN_STREAK_MASTER"
  | "BEST_COMBO"
  | "BLAZING_SINGLES"
  | "STEADY_PLAYER"
  | "NO_RECORD";

export interface RecapTitle {
  key: RecapTitleKey;
  label: string;
  emoji: string;
}

export interface RecapStats {
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  /** 0~100, 소수 1자리. */
  winRate: number;
  /** 기간 내 이 유저가 얻은 ELO 변동 합계(단식/복식 통합) — 음수일 수 있다. */
  eloChange: number;
  /** 기간 내 도달한 최고 레이팅. 경기가 없으면 null. */
  peakElo: number | null;
  longestWinStreak: number;
  /** 함께 뛴 경기의 승률이 가장 높은 파트너(복식) — 최소 2경기 이상 함께 뛴
   *  파트너 중에서만 뽑는다(동률이면 더 많이 함께 뛴 쪽). */
  bestPartner: PlayerRecord | null;
  /** 승률이 가장 높았던 상대 — 최소 2경기 이상 맞붙은 상대 중에서만 뽑는다(1경기 우연 배제). */
  bestOpponent: PlayerRecord | null;
  /** 승률이 가장 낮았던 상대(천적) — 위와 동일한 최소 경기수 기준. */
  worstOpponent: PlayerRecord | null;
  title: RecapTitle;
}

// 상대/파트너 전적을 "기록"으로 인정하는 최소 경기 수 — 1경기 결과만으로
// "천적/최고 상대/최고의 파트너"라고 부르면 우연에 크게 좌우되므로, 최소
// 2번은 맞붙거나 함께 뛰어야 인정한다.
const MIN_MATCHES_FOR_RECORD = 2;
const WIN_STREAK_TITLE_THRESHOLD = 3;
const BEST_COMBO_MIN_WIN_RATE = 70;
const BLAZING_SINGLES_MIN_MATCHES = 3;
const BLAZING_SINGLES_MIN_WIN_RATE = 60;

const TITLE_TEXT: Record<RecapTitleKey, Omit<RecapTitle, "key">> = {
  WIN_STREAK_MASTER: { label: "연승 마스터", emoji: "🔥" },
  BEST_COMBO: { label: "최고의 콤비", emoji: "🤝" },
  BLAZING_SINGLES: { label: "불꽃 단식러", emoji: "⚡" },
  STEADY_PLAYER: { label: "꾸준한 참가자", emoji: "🎾" },
  NO_RECORD: { label: "이번 기간엔 기록이 없어요", emoji: "📭" },
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function buildRecord(playerId: string, wins: number, losses: number, draws: number): PlayerRecord {
  const total = wins + losses + draws;
  return { playerId, wins, losses, draws, total, winRate: total > 0 ? round1((wins / total) * 100) : 0 };
}

/** 경기 목록에서 getIds가 뽑아주는 상대/파트너 id별로 승/패/무를 누적한다. */
function tallyRecords(
  matches: RecapMatchRecord[],
  getIds: (m: RecapMatchRecord) => string[]
): Map<string, PlayerRecord> {
  const tally = new Map<string, { wins: number; losses: number; draws: number }>();
  for (const m of matches) {
    for (const id of getIds(m)) {
      const cur = tally.get(id) ?? { wins: 0, losses: 0, draws: 0 };
      if (m.outcome === "WIN") cur.wins += 1;
      else if (m.outcome === "LOSS") cur.losses += 1;
      else cur.draws += 1;
      tally.set(id, cur);
    }
  }
  const result = new Map<string, PlayerRecord>();
  for (const [id, t] of tally) result.set(id, buildRecord(id, t.wins, t.losses, t.draws));
  return result;
}

/** 상대별 통산 전적 — 상대 id를 키로 승/패/무를 누적한다. */
export function computeOpponentRecords(matches: RecapMatchRecord[]): Map<string, PlayerRecord> {
  return tallyRecords(matches, (m) => m.opponentIds);
}

/** 파트너별(복식) 합산 전적 — 함께 팀을 이룬 경기만 집계한다. */
export function computePartnerRecords(matches: RecapMatchRecord[]): Map<string, PlayerRecord> {
  return tallyRecords(matches, (m) => (m.teammateId ? [m.teammateId] : []));
}

/** 시간순(approvalSeq 오름차순)으로 정렬된 경기 목록에서 최장 연승을 구한다. */
export function computeLongestWinStreak(matchesChronological: RecapMatchRecord[]): number {
  let longest = 0;
  let current = 0;
  for (const m of matchesChronological) {
    if (m.outcome === "WIN") {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

/**
 * 최소 경기 수 기준을 만족하는 기록 중 가장 극단적인(승률이 가장 높은/낮은)
 * 것을 고른다 — 동률이면 더 많이 맞붙은/함께 뛴 쪽을 우선한다.
 */
function pickExtremeRecord(records: Map<string, PlayerRecord>, mode: "best" | "worst"): PlayerRecord | null {
  let picked: PlayerRecord | null = null;
  for (const rec of records.values()) {
    if (rec.total < MIN_MATCHES_FOR_RECORD) continue;
    if (!picked) {
      picked = rec;
      continue;
    }
    const isMoreExtreme =
      mode === "best"
        ? rec.winRate > picked.winRate || (rec.winRate === picked.winRate && rec.total > picked.total)
        : rec.winRate < picked.winRate || (rec.winRate === picked.winRate && rec.total > picked.total);
    if (isMoreExtreme) picked = rec;
  }
  return picked;
}

function decideTitle(input: {
  totalMatches: number;
  longestWinStreak: number;
  bestPartner: PlayerRecord | null;
  singlesWins: number;
  singlesLosses: number;
  singlesDraws: number;
}): RecapTitle {
  if (input.totalMatches === 0) return { key: "NO_RECORD", ...TITLE_TEXT.NO_RECORD };

  if (input.longestWinStreak >= WIN_STREAK_TITLE_THRESHOLD) {
    return { key: "WIN_STREAK_MASTER", ...TITLE_TEXT.WIN_STREAK_MASTER };
  }

  if (input.bestPartner && input.bestPartner.winRate >= BEST_COMBO_MIN_WIN_RATE) {
    return { key: "BEST_COMBO", ...TITLE_TEXT.BEST_COMBO };
  }

  const singlesTotal = input.singlesWins + input.singlesLosses + input.singlesDraws;
  const singlesWinRate = singlesTotal > 0 ? (input.singlesWins / singlesTotal) * 100 : 0;
  if (singlesTotal >= BLAZING_SINGLES_MIN_MATCHES && singlesWinRate >= BLAZING_SINGLES_MIN_WIN_RATE) {
    return { key: "BLAZING_SINGLES", ...TITLE_TEXT.BLAZING_SINGLES };
  }

  return { key: "STEADY_PLAYER", ...TITLE_TEXT.STEADY_PLAYER };
}

/**
 * 리캡 카드에 필요한 전체 통계를 계산한다.
 * @param matchesChronological approvalSeq 오름차순으로 정렬된, 기간 내 이
 *   유저가 참여한 APPROVED 경기 목록.
 */
export function computeRecapStats(matchesChronological: RecapMatchRecord[]): RecapStats {
  const totalMatches = matchesChronological.length;
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let eloChange = 0;
  let peakElo: number | null = null;
  let singlesWins = 0;
  let singlesLosses = 0;
  let singlesDraws = 0;

  for (const m of matchesChronological) {
    if (m.outcome === "WIN") wins += 1;
    else if (m.outcome === "LOSS") losses += 1;
    else draws += 1;

    eloChange += m.delta;
    peakElo = peakElo === null ? m.ratingAfter : Math.max(peakElo, m.ratingAfter);

    if (m.type === "SINGLES") {
      if (m.outcome === "WIN") singlesWins += 1;
      else if (m.outcome === "LOSS") singlesLosses += 1;
      else singlesDraws += 1;
    }
  }

  const winRate = totalMatches > 0 ? round1((wins / totalMatches) * 100) : 0;
  const longestWinStreak = computeLongestWinStreak(matchesChronological);
  const bestPartner = pickExtremeRecord(computePartnerRecords(matchesChronological), "best");
  const opponentRecords = computeOpponentRecords(matchesChronological);
  const bestOpponent = pickExtremeRecord(opponentRecords, "best");
  const worstOpponent = pickExtremeRecord(opponentRecords, "worst");

  const title = decideTitle({
    totalMatches,
    longestWinStreak,
    bestPartner,
    singlesWins,
    singlesLosses,
    singlesDraws,
  });

  return {
    totalMatches,
    wins,
    losses,
    draws,
    winRate,
    eloChange,
    peakElo,
    longestWinStreak,
    bestPartner,
    bestOpponent,
    worstOpponent,
    title,
  };
}
