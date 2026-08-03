import { PlayerBadge } from "@/components/PlayerBadge";
import type { AvatarUser } from "@/lib/avatar";
import type { MatchType } from "@/generated/prisma/client";

export interface TeamPlayer extends AvatarUser {
  id: string;
  name: string;
}

export function TeamBadges({
  type,
  player1,
  player2,
}: {
  type: MatchType;
  player1: TeamPlayer;
  player2?: TeamPlayer | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center gap-1">
        <PlayerBadge user={player1} name={player1.name} />
        {type === "DOUBLES" && <span className="text-[10px] text-gray-400">포핸드</span>}
      </div>
      {type === "DOUBLES" && player2 && (
        <div className="flex flex-col items-center gap-1">
          <PlayerBadge user={player2} name={player2.name} />
          <span className="text-[10px] text-gray-400">백핸드</span>
        </div>
      )}
    </div>
  );
}
