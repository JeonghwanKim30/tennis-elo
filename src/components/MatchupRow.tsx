import { TeamBadges, type TeamPlayer } from "@/components/TeamBadges";
import type { MatchType } from "@/generated/prisma/client";

export function MatchupRow({
  type,
  teamA1,
  teamA2,
  teamB1,
  teamB2,
  center,
}: {
  type: MatchType;
  teamA1: TeamPlayer;
  teamA2?: TeamPlayer | null;
  teamB1: TeamPlayer;
  teamB2?: TeamPlayer | null;
  center?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <TeamBadges type={type} player1={teamA1} player2={teamA2} />
      <div className="flex shrink-0 flex-col items-center gap-1 text-center">
        <span className="text-sm font-semibold text-muted-foreground">VS</span>
        {center}
      </div>
      <TeamBadges type={type} player1={teamB1} player2={teamB2} />
    </div>
  );
}
