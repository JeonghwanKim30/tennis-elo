// 브랜드 마크 — 귀여운 얼굴이 있는 테니스공 마스코트. 홈 화면 추가 아이콘
// (apple-touch-icon/favicon, scripts/generate-brand-icons.mjs)과 정확히 같은
// 디자인을 앱 안의 모든 로고/아이콘 자리(헤더, 랜딩, 로그인 카드 등)에서
// 그대로 재사용해 브랜드 마크를 하나로 통일한다.
export function TeddiMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="var(--primary)" />
      <path
        d="M4 21c14 9 42 9 56 0M4 43c14-9 42-9 56 0"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <ellipse cx="20" cy="19" rx="7" ry="4.2" fill="#ffffff" opacity="0.35" transform="rotate(-25 20 19)" />
      <circle cx="23" cy="30" r="2.6" fill="var(--foreground)" />
      <circle cx="41" cy="30" r="2.6" fill="var(--foreground)" />
      <path
        d="M24 38q8 7 16 0"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 아이콘 + "TEDDI.B" 워드마크 조합. 헤더/로그인 화면 등 실제 UI에서는
// 이 컴포넌트를 쓴다(파비콘 등 정적 이미지가 필요한 곳은 TeddiMark만 래스터화).
export function TeddiWordmark({
  size = "md",
  layout = "row",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  layout?: "row" | "column";
  className?: string;
}) {
  const markSize = size === "lg" ? "h-16 w-16" : size === "md" ? "h-9 w-9" : "h-7 w-7";
  const textSize = size === "lg" ? "text-4xl" : size === "md" ? "text-xl" : "text-base";
  const flexDir = layout === "column" ? "flex-col" : "flex-row";
  return (
    <span className={`inline-flex ${flexDir} items-center gap-2 ${className}`}>
      <TeddiMark className={markSize} />
      <span className={`font-display ${textSize} font-bold tracking-wide text-primary`}>
        TEDDI.B
      </span>
    </span>
  );
}
