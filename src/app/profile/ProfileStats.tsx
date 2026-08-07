import Link from "next/link";
import { RESULT_LABEL } from "@/lib/matchDisplay";
import { type TeamPlayer } from "@/components/TeamBadges";
import { MatchupRow } from "@/components/MatchupRow";
import { TierBadge } from "@/components/TierBadge";
import { getTier } from "@/lib/tier";
import type { Match, MatchDay } from "@/generated/prisma/client";

type Tab = "all" | "singles" | "doubles";
type MatchWithDay = Match & { matchDay: MatchDay };
interface RatingLike {
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

// ELO 카드 / 총 전적 / 탭 / 경기 기록 목록 — 본인 프로필과 타인 프로필이
// 완전히 똑같이 보여주는 부분이라 하나로 공유한다. 편집 UI(사진 변경, 자기소개,
// 전화번호)는 각 페이지가 이 컴포넌트 "위"에 따로 그린다. basePath만 다르게
// 넘기면 탭 링크가 /profile 또는 /profile/[userId] 어느 쪽에서든 올바르게 동작한다.
export function ProfileStats({
  basePath,
  tab,
  singles,
  doubles,
  matches,
  playerById,
}: {
  basePath: string;
  tab: Tab;
  singles?: RatingLike;
  doubles?: RatingLike;
  matches: MatchWithDay[];
  playerById: Map<string, TeamPlayer>;
}) {
  const totalWins = (singles?.wins ?? 0) + (doubles?.wins ?? 0);
  const totalLosses = (singles?.losses ?? 0) + (doubles?.losses ?? 0);
  const totalDraws = (singles?.draws ?? 0) + (doubles?.draws ?? 0);
  const totalGames = totalWins + totalLosses + totalDraws;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="surface-card space-y-1.5 p-4 text-center">
          <p className="text-sm text-muted-foreground">단식 ELO</p>
          <p className="font-display text-4xl font-bold text-primary">
            {Math.round(singles?.rating ?? 1200)}
          </p>
          <TierBadge tier={getTier(singles?.rating ?? 1200)} />
        </div>
        <div className="surface-card space-y-1.5 p-4 text-center">
          <p className="text-sm text-muted-foreground">복식 ELO</p>
          <p className="font-display text-4xl font-bold text-primary">
            {Math.round(doubles?.rating ?? 1200)}
          </p>
          <TierBadge tier={getTier(doubles?.rating ?? 1200)} />
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
          <TabLink basePath={basePath} tab="all" current={tab} label="전체" />
          <TabLink basePath={basePath} tab="singles" current={tab} label="단식" />
          <TabLink basePath={basePath} tab="doubles" current={tab} label="복식" />
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
          {matches.length === 0 && (
            <p className="text-sm text-muted-foreground">경기 기록이 없습니다.</p>
          )}
          {matches.map((m) => {
            const teamAP1 = playerById.get(m.teamAPlayer1);
            const teamAP2 = m.teamAPlayer2 ? playerById.get(m.teamAPlayer2) : null;
            const teamBP1 = playerById.get(m.teamBPlayer1);
            const teamBP2 = m.teamBPlayer2 ? playerById.get(m.teamBPlayer2) : null;
            if (!teamAP1 || !teamBP1) return null;
            return (
              <li key={m.id} className="surface-card px-5 py-4 text-sm">
                <p className="mb-2 text-muted-foreground">
                  {m.type === "SINGLES" ? "단식" : "복식"} ·{" "}
                  {m.matchDay.date.toISOString().slice(0, 10)}
                </p>
                <MatchupRow
                  type={m.type}
                  teamA1={teamAP1}
                  teamA2={teamAP2}
                  teamB1={teamBP1}
                  teamB2={teamBP2}
                  teamAEloChange={m.teamAEloChange}
                  teamBEloChange={m.teamBEloChange}
                  center={
                    <span className="font-medium">
                      {m.result ? RESULT_LABEL[m.result] : ""}
                      {m.teamAScore !== null && m.teamBScore !== null
                        ? ` (${m.teamAScore}:${m.teamBScore})`
                        : ""}
                    </span>
                  }
                />
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

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

function TabLink({
  basePath,
  tab,
  current,
  label,
}: {
  basePath: string;
  tab: Tab;
  current: Tab;
  label: string;
}) {
  const isActive = tab === current;
  const href = tab === "all" ? basePath : `${basePath}?tab=${tab}`;
  return (
    <Link
      href={href}
      scroll={false}
      className={`tab-pill btn-press touch-target rounded-full px-4 py-2 text-sm font-medium ${
        isActive ? "bg-primary text-white shadow-sm shadow-primary/30" : "bg-muted text-foreground/70"
      }`}
    >
      {label}
    </Link>
  );
}
