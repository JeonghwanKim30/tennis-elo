"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { RESULT_LABEL } from "@/lib/matchDisplay";
import { type TeamPlayer } from "@/components/TeamBadges";
import { MatchupRow } from "@/components/MatchupRow";
import { TierBadge } from "@/components/TierBadge";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { useLoadMore } from "@/lib/useLoadMore";
import { getTier, isPlacement } from "@/lib/tier";
import type { Match, MatchDay, MatchType } from "@/generated/prisma/client";

type Tab = "all" | "singles" | "doubles";
type MatchWithDay = Match & { matchDay: MatchDay; eloHistory: { userId: string; delta: number }[] };
interface RatingLike {
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

const TAB_TYPE: Record<Tab, MatchType | undefined> = { all: undefined, singles: "SINGLES", doubles: "DOUBLES" };

// ELO 카드 / 총 전적 / 탭 / 경기 기록 목록 — 본인 프로필과 타인 프로필이
// 완전히 똑같이 보여주는 부분이라 하나로 공유한다. 편집 UI(사진 변경, 자기소개,
// 전화번호)는 각 페이지가 이 컴포넌트 "위"에 따로 그린다.
//
// 전체/단식/복식 탭은 예전엔 <Link href="?tab=...">였다 — 탭을 처음 누를
// 때마다 서버를 새로 왕복해 이미 갖고 있던 matches 배열을 타입만 다르게
// 다시 조회했다. 실제로는 순수 배열 filter라 서버 데이터가 전혀 필요 없어서,
// matches를 처음부터 전체 다 받아두고 여기서 useState+useMemo로 즉시
// 걸러낸다.
export function ProfileStats({
  singles,
  doubles,
  matches,
  playerById,
}: {
  singles?: RatingLike;
  doubles?: RatingLike;
  matches: MatchWithDay[];
  playerById: Map<string, TeamPlayer>;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const handleTabChange = useCallback((t: Tab) => setTab(t), []);

  const filteredMatches = useMemo(() => {
    const type = TAB_TYPE[tab];
    return type ? matches.filter((m) => m.type === type) : matches;
  }, [matches, tab]);
  // 탭을 바꾸면(resetKey=tab) 최근 5개부터 다시 보여준다 — "더보기"로
  // 늘려뒀던 개수가 다른 종목 탭에 그대로 남아있지 않게 한다.
  const { visibleItems: visibleMatches, hasMore, showMore } = useLoadMore(filteredMatches, 5, tab);

  const totalWins = (singles?.wins ?? 0) + (doubles?.wins ?? 0);
  const totalLosses = (singles?.losses ?? 0) + (doubles?.losses ?? 0);
  const totalDraws = (singles?.draws ?? 0) + (doubles?.draws ?? 0);
  const totalGames = totalWins + totalLosses + totalDraws;

  const singlesTotal = (singles?.wins ?? 0) + (singles?.losses ?? 0) + (singles?.draws ?? 0);
  const doublesTotal = (doubles?.wins ?? 0) + (doubles?.losses ?? 0) + (doubles?.draws ?? 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="surface-card space-y-1.5 p-4 text-center">
          <p className="text-sm text-muted-foreground">단식 ELO</p>
          {isPlacement(singlesTotal) ? (
            <p className="font-display text-2xl font-bold text-muted-foreground">배치 중</p>
          ) : (
            <>
              <p className="font-display text-4xl font-bold text-primary">
                {Math.round(singles?.rating ?? 1200)}
              </p>
              <TierBadge tier={getTier(singles?.rating ?? 1200)} />
            </>
          )}
        </div>
        <div className="surface-card space-y-1.5 p-4 text-center">
          <p className="text-sm text-muted-foreground">복식 ELO</p>
          {isPlacement(doublesTotal) ? (
            <p className="font-display text-2xl font-bold text-muted-foreground">배치 중</p>
          ) : (
            <>
              <p className="font-display text-4xl font-bold text-primary">
                {Math.round(doubles?.rating ?? 1200)}
              </p>
              <TierBadge tier={getTier(doubles?.rating ?? 1200)} />
            </>
          )}
        </div>
      </div>

      <div className="surface-card p-4">
        <p className="mb-2 text-sm text-muted-foreground">총 전적</p>
        <div className="flex gap-6 text-center">
          <Stat label="경기" value={totalGames} />
          <Stat label="승" value={totalWins} />
          <Stat label="패" value={totalLosses} />
          <Stat label="무" value={totalDraws} />
        </div>
      </div>

      <div>
        <div className="mb-4 flex gap-2">
          <TabButton tab="all" current={tab} onSelect={handleTabChange} label="전체" />
          <TabButton tab="singles" current={tab} onSelect={handleTabChange} label="단식" />
          <TabButton tab="doubles" current={tab} onSelect={handleTabChange} label="복식" />
        </div>

        <div className="mb-4 space-y-3">
          {(tab === "all" || tab === "singles") && (
            <BreakdownRow
              label="단식"
              wins={singles?.wins ?? 0}
              losses={singles?.losses ?? 0}
              draws={singles?.draws ?? 0}
            />
          )}
          {(tab === "all" || tab === "doubles") && (
            <BreakdownRow
              label="복식"
              wins={doubles?.wins ?? 0}
              losses={doubles?.losses ?? 0}
              draws={doubles?.draws ?? 0}
            />
          )}
        </div>

        <ul className="min-h-[160px] space-y-3">
          {filteredMatches.length === 0 && (
            <p className="text-sm text-muted-foreground">경기 기록이 없습니다.</p>
          )}
          {visibleMatches.map((m) => (
            <MatchHistoryCard key={m.id} match={m} playerById={playerById} />
          ))}
        </ul>
        <LoadMoreButton hasMore={hasMore} onClick={showMore} />
      </div>
    </>
  );
}

// 탭이 바뀌어도 화면에 이미 떠 있던 경기 카드는 자기 props(match/playerById)가
// 실제로 안 바뀌면 다시 그리지 않는다 — 경기 이력이 늘어날수록 카드 개수도
// 그대로 늘어나는 리스트라, 탭 전환마다 전부 재렌더링하면 그 자체가
// 버벅임의 원인이 된다.
const MatchHistoryCard = memo(function MatchHistoryCard({
  match: m,
  playerById,
}: {
  match: MatchWithDay;
  playerById: Map<string, TeamPlayer>;
}) {
  const teamAP1 = playerById.get(m.teamAPlayer1);
  const teamAP2 = m.teamAPlayer2 ? playerById.get(m.teamAPlayer2) : null;
  const teamBP1 = playerById.get(m.teamBPlayer1);
  const teamBP2 = m.teamBPlayer2 ? playerById.get(m.teamBPlayer2) : null;
  if (!teamAP1 || !teamBP1) return null;
  const eloChangeByPlayer = Object.fromEntries(m.eloHistory.map((h) => [h.userId, h.delta]));
  return (
    <li className="surface-card px-5 py-4 text-sm">
      <p className="mb-2 text-muted-foreground">
        {m.type === "SINGLES" ? "단식" : "복식"} · {m.matchDay.date.toISOString().slice(0, 10)}
      </p>
      <MatchupRow
        type={m.type}
        teamA1={teamAP1}
        teamA2={teamAP2}
        teamB1={teamBP1}
        teamB2={teamBP2}
        eloChangeByPlayer={eloChangeByPlayer}
        resultLabel={m.result ? RESULT_LABEL[m.result] : undefined}
        scoreLabel={
          m.teamAScore !== null && m.teamBScore !== null ? `(${m.teamAScore}:${m.teamBScore})` : undefined
        }
      />
    </li>
  );
});

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function BreakdownRow({
  label,
  wins,
  losses,
  draws,
}: {
  label: string;
  wins: number;
  losses: number;
  draws: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-2.5 text-sm">
      <span className="font-medium">{label}</span>
      <span>
        {wins}승 {losses}패 {draws}무 (총 {wins + losses + draws}경기)
      </span>
    </div>
  );
}

function TabButton({
  tab,
  current,
  onSelect,
  label,
}: {
  tab: Tab;
  current: Tab;
  onSelect: (tab: Tab) => void;
  label: string;
}) {
  const isActive = tab === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(tab)}
      className={`tab-pill btn-press touch-target rounded-full px-4 py-2 text-sm font-medium ${
        isActive ? "bg-primary text-white shadow-sm shadow-primary/30" : "bg-muted text-foreground/70"
      }`}
    >
      {label}
    </button>
  );
}
