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
  teamAFooter,
  teamBFooter,
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
  /** 점수 입력 스핀박스 등, 각 팀 영역 바로 아래에 넣을 내용(A팀/B팀 각각). */
  teamAFooter?: React.ReactNode;
  teamBFooter?: React.ReactNode;
  center?: React.ReactNode;
}) {
  // A팀(왼쪽) - VS/스코어(중앙) - B팀(오른쪽) 가로 대칭 구조를 화면 크기와
  // 무관하게 항상 유지한다(복식도 팀원 2명을 세로로 쌓아 폭을 아끼므로 좁은
  // 화면에서도 굳이 세로로 쌓을 필요가 없다).
  return (
    <div className="flex items-center justify-between gap-2">
      <TeamBadges
        type={type}
        side="A"
        player1={teamA1}
        player2={teamA2}
        eloChange={teamAEloChange}
        player1Tier={teamA1Tier}
        player2Tier={teamA2Tier}
        footer={teamAFooter}
      />
      <div className="flex shrink-0 flex-col items-center gap-1 px-1 text-center">
        <span className="text-sm font-semibold text-muted-foreground">VS</span>
        {center}
      </div>
      <TeamBadges
        type={type}
        side="B"
        player1={teamB1}
        player2={teamB2}
        eloChange={teamBEloChange}
        player1Tier={teamB1Tier}
        player2Tier={teamB2Tier}
        footer={teamBFooter}
      />
    </div>
  );
}
