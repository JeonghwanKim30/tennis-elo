// 브랜드 마크 — 테니스공을 단순화한 원 + 심 라인. 파비콘/PWA 아이콘도 이 모양을
// 그대로 래스터화해서 쓴다(scripts/generate-brand-assets.mjs 참고).
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
