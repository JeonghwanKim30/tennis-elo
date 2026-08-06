import { getTier, type Tier } from "@/lib/tier";

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
};

// 티어 색상은 사용자마다 달라 Tailwind 고정 팔레트로는 표현할 수 없으므로
// (아이언 #8C8C8C ~ 챌린저 #FF4500 등 8가지 고유 색상) 배경/글자색 모두
// 인라인 style로 직접 지정한다.
export function TierBadge({
  rating,
  tier: tierProp,
  size = "md",
}: {
  rating?: number;
  tier?: Tier;
  size?: "sm" | "md";
}) {
  const tier = tierProp ?? getTier(rating ?? 1200);
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-bold ${SIZE_CLASSES[size]}`}
      style={{ backgroundColor: tier.color, color: tier.textColor }}
    >
      {tier.label}
    </span>
  );
}
