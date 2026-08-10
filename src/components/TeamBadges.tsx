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
  side,
  player1,
  player2,
  eloChange,
  player1Tier,
  player2Tier,
  footer,
}: {
  type: MatchType;
  /** A팀은 카드 왼쪽(ELO 배지가 프로필 바깥쪽=왼쪽), B팀은 오른쪽(배지가 바깥쪽=오른쪽). */
  side: "A" | "B";
  player1: TeamPlayer;
  player2?: TeamPlayer | null;
  /** 완료된 경기에서만 존재 — 복식은 팀원 두 명에게 동일하게 적용된 값이다. */
  eloChange?: number | null;
  /** 해당 경기 종목(단식/복식) 기준 각 선수의 현재 티어 — 있으면 아바타에 색 링으로 표시. */
  player1Tier?: Tier;
  player2Tier?: Tier;
  /** 점수 입력 스핀박스 등, 팀 영역 하단에 추가로 넣을 내용. */
  footer?: React.ReactNode;
}) {
  const showElo = eloChange !== undefined && eloChange !== null;
  const players =
    type === "DOUBLES" && player2
      ? [
          { player: player1, tier: player1Tier },
          { player: player2, tier: player2Tier },
        ]
      : [{ player: player1, tier: player1Tier }];

  return (
    <div className={`flex flex-col gap-2 ${side === "A" ? "items-start" : "items-end"}`}>
      {players.map(({ player, tier }) => (
        <div key={player.id} className={`flex items-center gap-1.5 ${side === "B" ? "flex-row-reverse" : ""}`}>
          {showElo && <EloChangeBadge value={eloChange} />}
          <PlayerBadge avatarSrc={player.avatarSrc} name={player.name} userId={player.id} tier={tier} />
        </div>
      ))}
      {footer && <div className="mt-1 self-center">{footer}</div>}
    </div>
  );
}
