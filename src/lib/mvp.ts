// 경기일 "오늘의 MVP" — 그날 완료된 모든 경기의 순 ELO 변동 합계가 가장 높은
// 유저 1명을 뽑는다. 합계가 0 이하면 미선정(null).
export interface DailyMvpInput {
  teamAPlayer1: string;
  teamAPlayer2: string | null;
  teamBPlayer1: string;
  teamBPlayer2: string | null;
  result: "TEAM_A_WIN" | "TEAM_B_WIN" | "DRAW" | null;
  // userId -> 실제 개인별 ELO 변동량(EloHistory.delta). 복식은 distributeDoublesDelta로
  // 팀원별 차등 배분되므로 팀 전체 값(teamAEloChange/teamBEloChange)을 그대로 쓰면
  // 실제로 더 적게/많이 받은 선수를 구분하지 못해 MVP 집계가 부정확해진다.
  eloChangeByPlayer: Record<string, number>;
}

export interface DailyMvpResult {
  userId: string;
  totalEloGain: number;
  wins: number;
  losses: number;
}

export function computeDailyMvp(matches: DailyMvpInput[]): DailyMvpResult | null {
  const totals = new Map<string, { gain: number; wins: number; losses: number }>();

  function add(userId: string, gain: number, outcome: "WIN" | "LOSS" | "DRAW") {
    const cur = totals.get(userId) ?? { gain: 0, wins: 0, losses: 0 };
    cur.gain += gain;
    if (outcome === "WIN") cur.wins += 1;
    else if (outcome === "LOSS") cur.losses += 1;
    totals.set(userId, cur);
  }

  for (const m of matches) {
    if (!m.result) continue;
    const aIds = [m.teamAPlayer1, m.teamAPlayer2].filter((id): id is string => !!id);
    const bIds = [m.teamBPlayer1, m.teamBPlayer2].filter((id): id is string => !!id);
    const aOutcome = m.result === "TEAM_A_WIN" ? "WIN" : m.result === "TEAM_B_WIN" ? "LOSS" : "DRAW";
    const bOutcome = m.result === "TEAM_A_WIN" ? "LOSS" : m.result === "TEAM_B_WIN" ? "WIN" : "DRAW";
    for (const id of aIds) {
      const gain = m.eloChangeByPlayer[id];
      if (gain !== undefined) add(id, gain, aOutcome);
    }
    for (const id of bIds) {
      const gain = m.eloChangeByPlayer[id];
      if (gain !== undefined) add(id, gain, bOutcome);
    }
  }

  let best: DailyMvpResult | null = null;
  for (const [userId, stat] of totals) {
    if (stat.gain <= 0) continue;
    if (!best || stat.gain > best.totalEloGain) {
      best = { userId, totalEloGain: stat.gain, wins: stat.wins, losses: stat.losses };
    }
  }
  return best;
}
