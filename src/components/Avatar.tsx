const SIZE_CLASSES = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-24 w-24",
};

export function Avatar({
  src,
  size = "sm",
  className = "",
}: {
  src: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`${SIZE_CLASSES[size]} shrink-0 rounded-full border border-border object-cover ${className}`}
    />
  );
}
