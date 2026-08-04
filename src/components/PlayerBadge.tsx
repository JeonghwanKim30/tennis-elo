import { Avatar } from "@/components/Avatar";

export function PlayerBadge({
  avatarSrc,
  name,
  size = "sm",
}: {
  avatarSrc: string;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <Avatar src={avatarSrc} size={size} />
      <span className="text-xs text-gray-700">{name}</span>
    </div>
  );
}
