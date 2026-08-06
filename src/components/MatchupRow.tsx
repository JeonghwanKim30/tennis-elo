import { TeamBadges, type TeamPlayer } from "@/components/TeamBadges";
import type { MatchType } from "@/generated/prisma/client";
import type { Tier } from "@/lib/tier";

export function MatchupRow({
  type,
  teamA1,
  teamA2,
  teamB1,
  teamB2,
  teamAEloChange,
  teamBEloChange,
  teamA1Tier,
  teamA2Tier,
  teamB1Tier,
  teamB2Tier,
  center,
}: {
  type: MatchType;
  teamA1: TeamPlayer;
  teamA2?: TeamPlayer | null;
  teamB1: TeamPlayer;
  teamB2?: TeamPlayer | null;
  /** 완료된 경기에서만 전달 — 팀원 전원에게 동일하게 적용된 ELO 변동량. */
  teamAEloChange?: number | null;
  teamBEloChange?: number | null;
  /** 이 경기 종목(단식/복식) 기준, 각 선수의 현재 티어. */
  teamA1Tier?: Tier;
  teamA2Tier?: Tier;
  teamB1Tier?: Tier;
  teamB2Tier?: Tier;
  center?: React.ReactNode;
}) {
  // 복식(선수 4명 + 중앙 VS/스코어)은 좁은 화면에서 한 줄에 다 못 들어가 밖으로
  // 삐져나오므로, 모바일에서는 A팀 → VS → B팀 순으로 세로로 쌓고 데스크톱
  // 너비(sm 이상)에서만 기존처럼 한 줄로 펼친다.
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
      <TeamBadges
        type={type}
        player1={teamA1}
        player2={teamA2}
        eloChange={teamAEloChange}
        player1Tier={teamA1Tier}
        player2Tier={teamA2Tier}
      />
      <div className="flex shrink-0 flex-col items-center gap-1 text-center">
        <span className="text-sm font-semibold text-muted-foreground">VS</span>
        {center}
      </div>
      <TeamBadges
        type={type}
        player1={teamB1}
        player2={teamB2}
        eloChange={teamBEloChange}
        player1Tier={teamB1Tier}
        player2Tier={teamB2Tier}
      />
    </div>
  );
}
