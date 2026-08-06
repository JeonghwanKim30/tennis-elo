import { getTier } from "@/lib/tier";

export function TierBadge({ rating }: { rating: number }) {
  const tier = getTier(rating);
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ${tier.badgeClassName}`}
    >
      {tier.label}
    </span>
  );
}
