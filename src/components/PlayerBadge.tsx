import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { Tier } from "@/lib/tier";

// 이름 텍스트가 아바타보다 넓어져서 슬롯/카드 밖으로 삐져나오지 않도록,
// 각 사이즈별로 아바타 폭과 비슷한 너비를 정해두고 그 안에서만 말줄임 처리한다.
const WIDTH_CLASSES = {
  sm: "w-12",
  md: "w-16",
  lg: "w-24",
};

const RING_OFFSET = {
  sm: "0 0 0 2px",
  md: "0 0 0 2.5px",
  lg: "0 0 0 3px",
};

export function PlayerBadge({
  avatarSrc,
  name,
  size = "md",
  userId,
  tier,
}: {
  avatarSrc: string;
  name: string;
  size?: "sm" | "md" | "lg";
  /** 넘기면 아바타+이름 전체가 해당 유저의 프로필(/profile/[userId])로 가는 링크가 된다.
   *  경기 구성(드래그 앤 드롭으로 선수를 고르는 화면)처럼 클릭이 "선택"을 의미하는
   *  곳에서는 넘기지 않는다. */
  userId?: string;
  /** 넘기면 아바타 둘레에 티어 색상 링을 둘러 현재 실력대를 은은하게 보여준다
   *  (경기 카드처럼 좁은 자리에서는 텍스트 배지 대신 이 방식을 쓴다). */
  tier?: Tier;
}) {
  const content = (
    <div className={`flex ${WIDTH_CLASSES[size]} shrink-0 flex-col items-center gap-1 text-center`}>
      <div
        className="rounded-full"
        style={tier ? { boxShadow: `${RING_OFFSET[size]} ${tier.color}` } : undefined}
        title={tier?.label}
      >
        <Avatar src={avatarSrc} size={size} />
      </div>
      <span className="w-full truncate text-sm font-medium text-foreground">{name}</span>
    </div>
  );

  if (!userId) return content;

  return (
    <Link href={`/profile/${userId}`} className="btn-press rounded-lg">
      {content}
    </Link>
  );
}
