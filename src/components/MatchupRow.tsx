import { TeamBadges, type TeamPlayer } from "@/components/TeamBadges";
import type { MatchType } from "@/generated/prisma/client";
import type { Tier } from "@/lib/tier";

export function MatchupRow({
  type,
  teamA1,
  teamA2,
  teamB1,
  teamB2,
  eloChangeByPlayer,
  teamA1Tier,
  teamA2Tier,
  teamB1Tier,
  teamB2Tier,
  teamASideControl,
  teamBSideControl,
  resultLabel,
  scoreLabel,
}: {
  type: MatchType;
  teamA1: TeamPlayer;
  teamA2?: TeamPlayer | null;
  teamB1: TeamPlayer;
  teamB2?: TeamPlayer | null;
  /** 완료된 경기에서만 전달 — userId 기준 실제 개인별 ELO 변동량(EloHistory).
   *  복식은 distributeDoublesDelta로 팀원별 차등 배분된 값이라 두 선수가 다를 수 있다. */
  eloChangeByPlayer?: Record<string, number>;
  /** 이 경기 종목(단식/복식) 기준, 각 선수의 현재 티어. */
  teamA1Tier?: Tier;
  teamA2Tier?: Tier;
  teamB1Tier?: Tier;
  teamB2Tier?: Tier;
  /** ELO 배지와 같은 자리(팀 바깥쪽)에 대신 넣는 컨트롤 — 예정된 경기의 점수 스테퍼. */
  teamASideControl?: React.ReactNode;
  teamBSideControl?: React.ReactNode;
  /** "A팀 승" 등 승패 결과 한 줄. */
  resultLabel?: string;
  /** "(3:2)" 등 스코어 한 줄. */
  scoreLabel?: string;
}) {
  // A팀(왼쪽) - VS/스코어(중앙) - B팀(오른쪽) 가로 대칭 구조를 화면 크기와
  // 무관하게 항상 유지한다. 가운데 칸을 grid의 1fr로 못박아 두면, 결과
  // 텍스트가 아무리 길어도 그 칸 폭을 넘어서 양옆 ELO 배지를 카드 밖으로
  // 밀어내는 일이 없다(좌우 칸은 auto라 내용 폭만큼만 차지).
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
      <TeamBadges
        type={type}
        side="A"
        player1={teamA1}
        player2={teamA2}
        eloChangeByPlayer={eloChangeByPlayer}
        player1Tier={teamA1Tier}
        player2Tier={teamA2Tier}
        sideControl={teamASideControl}
      />
      <div className="flex min-w-0 flex-col items-center gap-0.5 px-1 text-center">
        {resultLabel && <span className="truncate text-sm font-semibold">{resultLabel}</span>}
        <span className="text-xs font-semibold text-muted-foreground">VS</span>
        {scoreLabel && <span className="truncate text-xs text-muted-foreground">{scoreLabel}</span>}
      </div>
      <TeamBadges
        type={type}
        side="B"
        player1={teamB1}
        player2={teamB2}
        eloChangeByPlayer={eloChangeByPlayer}
        player1Tier={teamB1Tier}
        player2Tier={teamB2Tier}
        sideControl={teamBSideControl}
      />
    </div>
  );
}
