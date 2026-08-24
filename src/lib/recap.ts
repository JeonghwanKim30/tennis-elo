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

export interface OpponentRecord {
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
  mostFrequentPartnerId: string | null;
  mostFrequentPartnerCount: number;
  /** 함께 뛴 파트너와의 합산 전적(가장 많이 뛴 파트너 기준). */
  partnerRecord: OpponentRecord | null;
  /** 승률이 가장 높았던 상대 — 최소 2경기 이상 맞붙은 상대 중에서만 뽑는다(1경기 우연 배제). */
  bestOpponent: OpponentRecord | null;
  /** 승률이 가장 낮았던 상대(천적) — 위와 동일한 최소 경기수 기준. */
  worstOpponent: OpponentRecord | null;
  title: RecapTitle;
}

// 상대 전적을 "기록"으로 인정하는 최소 경기 수 — 1경기 결과만으로 "천적/최고
// 상대"라고 부르면 우연에 크게 좌우되므로, 최소 2번은 맞붙어야 인정한다.
const MIN_OPPONENT_MATCHES_FOR_RECORD = 2;
const WIN_STREAK_TITLE_THRESHOLD = 3;
const BEST_COMBO_MIN_MATCHES = 2;
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

function buildRecord(playerId: string, wins: number, losses: number, draws: number): OpponentRecord {
  const total = wins + losses + draws;
  return { playerId, wins, losses, draws, total, winRate: total > 0 ? round1((wins / total) * 100) : 0 };
}

/** 상대별 통산 전적 — 상대 id를 키로 승/패/무를 누적한다. */
export function computeOpponentRecords(matches: RecapMatchRecord[]): Map<string, OpponentRecord> {
  const tally = new Map<string, { wins: number; losses: number; draws: number }>();
  for (const m of matches) {
    for (const oppId of m.opponentIds) {
      const cur = tally.get(oppId) ?? { wins: 0, losses: 0, draws: 0 };
      if (m.outcome === "WIN") cur.wins += 1;
      else if (m.outcome === "LOSS") cur.losses += 1;
      else cur.draws += 1;
      tally.set(oppId, cur);
    }
  }
  const result = new Map<string, OpponentRecord>();
  for (const [id, t] of tally) result.set(id, buildRecord(id, t.wins, t.losses, t.draws));
  return result;
}

/** 특정 파트너와 팀을 이뤄 뛴 경기만의 승/패/무 — "최고의 콤비" 판정에 쓴다. */
export function computePartnerRecord(matches: RecapMatchRecord[], partnerId: string): OpponentRecord {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const m of matches) {
    if (m.teammateId !== partnerId) continue;
    if (m.outcome === "WIN") wins += 1;
    else if (m.outcome === "LOSS") losses += 1;
    else draws += 1;
  }
  return buildRecord(partnerId, wins, losses, draws);
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

/** 복식에서 가장 많이 팀을 이룬 파트너. 동률이면 먼저 나온(더 이른 시점) 쪽을 유지한다. */
export function computeMostFrequentPartner(matches: RecapMatchRecord[]): { id: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const m of matches) {
    if (!m.teammateId) continue;
    counts.set(m.teammateId, (counts.get(m.teammateId) ?? 0) + 1);
  }
  let best: { id: string; count: number } | null = null;
  for (const [id, count] of counts) {
    if (!best || count > best.count) best = { id, count };
  }
  return best;
}

function pickExtremeOpponent(
  records: Map<string, OpponentRecord>,
  mode: "best" | "worst"
): OpponentRecord | null {
  let picked: OpponentRecord | null = null;
  for (const rec of records.values()) {
    if (rec.total < MIN_OPPONENT_MATCHES_FOR_RECORD) continue;
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
  partner: { id: string; count: number } | null;
  partnerRecord: OpponentRecord | null;
  singlesWins: number;
  singlesLosses: number;
  singlesDraws: number;
}): RecapTitle {
  if (input.totalMatches === 0) return { key: "NO_RECORD", ...TITLE_TEXT.NO_RECORD };

  if (input.longestWinStreak >= WIN_STREAK_TITLE_THRESHOLD) {
    return { key: "WIN_STREAK_MASTER", ...TITLE_TEXT.WIN_STREAK_MASTER };
  }

  if (
    input.partner &&
    input.partner.count >= BEST_COMBO_MIN_MATCHES &&
    input.partnerRecord &&
    input.partnerRecord.winRate >= BEST_COMBO_MIN_WIN_RATE
  ) {
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
  const partner = computeMostFrequentPartner(matchesChronological);
  const partnerRecord = partner ? computePartnerRecord(matchesChronological, partner.id) : null;
  const opponentRecords = computeOpponentRecords(matchesChronological);
  const bestOpponent = pickExtremeOpponent(opponentRecords, "best");
  const worstOpponent = pickExtremeOpponent(opponentRecords, "worst");

  const title = decideTitle({
    totalMatches,
    longestWinStreak,
    partner,
    partnerRecord,
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
    mostFrequentPartnerId: partner?.id ?? null,
    mostFrequentPartnerCount: partner?.count ?? 0,
    partnerRecord,
    bestOpponent,
    worstOpponent,
    title,
  };
}
