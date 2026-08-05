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
}: {
  avatarSrc: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className={`flex ${WIDTH_CLASSES[size]} shrink-0 flex-col items-center gap-1 text-center`}>
      <Avatar src={avatarSrc} size={size} />
      <span className="w-full truncate text-sm font-medium text-foreground">{name}</span>
    </div>
  );
}
