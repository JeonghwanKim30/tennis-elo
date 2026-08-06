import { PlayerBadge } from "@/components/PlayerBadge";
import type { MatchType } from "@/generated/prisma/client";
import type { Tier } from "@/lib/tier";

export interface TeamPlayer {
  id: string;
  name: string;
  avatarSrc: string;
}

// ELO 변동량 배지 — 상승은 하늘색, 하락은 빨간색으로 한눈에 구분되게 한다.
function EloChangeBadge({ value }: { value: number }) {
  const colorClass =
    value > 0
      ? "bg-sky-100 text-sky-500"
      : value < 0
        ? "bg-red-100 text-red-500"
        : "bg-muted text-muted-foreground";
  const label = value > 0 ? `+${value}` : String(value);
  return (
    <span className={`shrink-0 self-center rounded-full px-2 py-0.5 text-xs font-bold ${colorClass}`}>
      {label}
    </span>
  );
}

export function TeamBadges({
  type,
  player1,
  player2,
  eloChange,
  player1Tier,
  player2Tier,
}: {
  type: MatchType;
  player1: TeamPlayer;
  player2?: TeamPlayer | null;
  /** 완료된 경기에서만 존재 — 복식은 팀원 두 명에게 동일하게 적용된 값이다. */
  eloChange?: number | null;
  /** 해당 경기 종목(단식/복식) 기준 각 선수의 현재 티어 — 있으면 아바타에 색 링으로 표시. */
  player1Tier?: Tier;
  player2Tier?: Tier;
}) {
  const showElo = eloChange !== undefined && eloChange !== null;

  return (
    <div className="flex items-start gap-3">
      {/* 단식은 선수 1명 — 프로필 우측에 배지를 놓는다. */}
      {type === "SINGLES" && (
        <div className="flex items-center gap-1.5">
          <PlayerBadge avatarSrc={player1.avatarSrc} name={player1.name} userId={player1.id} tier={player1Tier} />
          {showElo && <EloChangeBadge value={eloChange} />}
        </div>
      )}

      {/* 복식은 포핸드(왼쪽 선수) 배지를 프로필 왼쪽에, 백핸드(오른쪽 선수) 배지를
          프로필 오른쪽에 놓아 두 선수를 바깥쪽에서 감싸듯 배치한다. */}
      {type === "DOUBLES" && (
        <div className="flex items-center gap-1.5">
          {showElo && <EloChangeBadge value={eloChange} />}
          <div className="flex flex-col items-center gap-1">
            <PlayerBadge avatarSrc={player1.avatarSrc} name={player1.name} userId={player1.id} tier={player1Tier} />
            <span className="text-xs text-muted-foreground">포핸드</span>
          </div>
        </div>
      )}
      {type === "DOUBLES" && player2 && (
        <div className="flex items-center gap-1.5">
          <div className="flex flex-col items-center gap-1">
            <PlayerBadge avatarSrc={player2.avatarSrc} name={player2.name} userId={player2.id} tier={player2Tier} />
            <span className="text-xs text-muted-foreground">백핸드</span>
          </div>
          {showElo && <EloChangeBadge value={eloChange} />}
        </div>
      )}
    </div>
  );
}
