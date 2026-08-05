import { Avatar } from "@/components/Avatar";

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
    <div className="flex flex-col items-center gap-1 text-center">
      <Avatar src={avatarSrc} size={size} />
      <span className="text-sm font-medium text-foreground">{name}</span>
    </div>
  );
}
