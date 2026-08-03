import { avatarSrc, type AvatarUser } from "@/lib/avatar";

const SIZE_CLASSES = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-24 w-24",
};

export function Avatar({
  user,
  size = "sm",
  className = "",
}: {
  user: AvatarUser;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarSrc(user)}
      alt=""
      className={`${SIZE_CLASSES[size]} shrink-0 rounded-full border border-gray-200 object-cover ${className}`}
    />
  );
}
