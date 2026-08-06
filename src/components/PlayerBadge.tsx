import Link from "next/link";
import { Avatar } from "@/components/Avatar";

// 이름 텍스트가 아바타보다 넓어져서 슬롯/카드 밖으로 삐져나오지 않도록,
// 각 사이즈별로 아바타 폭과 비슷한 너비를 정해두고 그 안에서만 말줄임 처리한다.
const WIDTH_CLASSES = {
  sm: "w-12",
  md: "w-16",
  lg: "w-24",
};

export function PlayerBadge({
  avatarSrc,
  name,
  size = "md",
  userId,
}: {
  avatarSrc: string;
  name: string;
  size?: "sm" | "md" | "lg";
  /** 넘기면 아바타+이름 전체가 해당 유저의 프로필(/profile/[userId])로 가는 링크가 된다.
   *  경기 구성(드래그 앤 드롭으로 선수를 고르는 화면)처럼 클릭이 "선택"을 의미하는
   *  곳에서는 넘기지 않는다. */
  userId?: string;
}) {
  const content = (
    <div className={`flex ${WIDTH_CLASSES[size]} shrink-0 flex-col items-center gap-1 text-center`}>
      <Avatar src={avatarSrc} size={size} />
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
