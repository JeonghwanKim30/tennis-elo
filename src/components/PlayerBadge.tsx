import { Avatar } from "@/components/Avatar";
import type { AvatarUser } from "@/lib/avatar";

export function PlayerBadge({
  user,
  name,
  size = "sm",
}: {
  user: AvatarUser;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <Avatar user={user} size={size} />
      <span className="text-xs text-gray-700">{name}</span>
    </div>
  );
}
