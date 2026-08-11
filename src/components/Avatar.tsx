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
    // 아바타는 base64 data URI로 이미 HTML에 인라인돼 있어(별도 네트워크
    // 요청이 없음) next/image 최적화 대상은 아니지만, 리더보드/유저 목록처럼
    // 아바타가 수십 개씩 나오는 화면에서 화면 밖 이미지의 디코딩을 뒤로
    // 미뤄 초기 렌더링 부담을 줄인다.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className={`${SIZE_CLASSES[size]} shrink-0 rounded-full border border-border object-cover ${className}`}
    />
  );
}
