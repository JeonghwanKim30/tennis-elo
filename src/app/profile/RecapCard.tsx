import { forwardRef } from "react";
import { TeddiMark } from "@/components/TeddiMark";
import type { RecapCardData } from "./actions";

// 캡처(html-to-image)될 실제 카드 DOM. 화면에 보이는 미리보기와 다운로드되는
// PNG의 "디자인 크기"는 항상 360px으로 동일하다 — 다만 화면에 띄울 때는
// w-full max-w-[360px]로 유동 폭을 둬서 좁은 모바일 화면에서도 카드가
// 뷰포트를 벗어나지 않게 하고, 실제 PNG로 저장할 때는 RecapModalContent가
// html-to-image의 width 옵션으로 항상 360px 기준 해상도를 강제해 캡처
// 시점의 화면 크기와 무관하게 출력 결과가 항상 동일하게 나오도록 한다.
// 텍스트 줄바꿈으로 인한 레이아웃 깨짐을 막기 위해 이름/칭호/라벨류에는
// whitespace-nowrap + break-keep(한글 단어 중간에서 안 끊기게) +
// leading-tight를 일관되게 적용한다.
export const RecapCard = forwardRef<HTMLDivElement, { data: RecapCardData }>(function RecapCard({ data }, ref) {
  const { stats } = data;
  const eloSign = stats.eloChange > 0 ? "+" : stats.eloChange < 0 ? "" : "±";
  const eloColor = stats.eloChange > 0 ? "#2fbf71" : stats.eloChange < 0 ? "#ef4444" : "#5f7b70";

  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-[1.75rem] p-4 text-[#1f3b30] shadow-xl"
      style={{
        boxSizing: "border-box",
        background: "linear-gradient(180deg, #eafcf1 0%, #f5fbf7 55%, #ffffff 100%)",
      }}
    >
      {/* 배경 장식 — 은은한 테니스공 실루엣 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 -right-12 h-36 w-36 rounded-full opacity-[0.12]"
        style={{ background: "#2fbf71" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-14 -left-8 h-32 w-32 rounded-full opacity-[0.10]"
        style={{ background: "#5ec6f0" }}
      />

      <div className="relative space-y-3">
        {/* 상단: 로고 + 기간 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex shrink-0 items-center gap-1.5">
            <TeddiMark className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap text-xs font-bold tracking-wide text-[#2fbf71]">TEDDI.B</span>
          </div>
          <span className="min-w-0 truncate rounded-full bg-white/70 px-2 py-0.5 text-[10px] leading-tight font-medium break-keep text-[#5f7b70]">
            {data.periodLabel}
          </span>
        </div>

        {/* 프로필 */}
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.avatarSrc}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base leading-tight font-bold break-keep">{data.userName}</p>
            <span
              className="inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] leading-tight font-bold whitespace-nowrap"
              style={{ backgroundColor: data.tierColor, color: data.tierTextColor }}
            >
              {data.tierLabel}
            </span>
          </div>
        </div>

        {/* 칭호 배지 */}
        <div className="flex justify-center px-2">
          <span className="max-w-full truncate rounded-full bg-[#1f3b30] px-3 py-1 text-xs leading-tight font-bold whitespace-nowrap text-white">
            {stats.title.emoji} {stats.title.label}
          </span>
        </div>

        {/* 중앙 대형 스탯 */}
        <div className="rounded-2xl bg-white/80 p-3.5 text-center shadow-sm">
          <p className="leading-tight font-medium break-keep whitespace-nowrap text-[#5f7b70]" style={{ fontSize: "11px" }}>
            기간 내 ELO 변동
          </p>
          <p className="font-display leading-none font-extrabold whitespace-nowrap" style={{ color: eloColor, fontSize: "38px" }}>
            {eloSign}
            {stats.eloChange}
          </p>

          <div className="mt-2.5">
            <div className="mb-1 flex items-center justify-between text-[11px] leading-tight font-medium whitespace-nowrap text-[#5f7b70]">
              <span>승률</span>
              <span>{stats.winRate}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#eaf6f0]">
              <div
                className="h-full rounded-full"
                style={{ width: `${stats.winRate}%`, background: "#2fbf71" }}
              />
            </div>
          </div>

          <div className="mt-2.5 flex justify-center gap-4">
            <Stat label="경기" value={stats.totalMatches} />
            <Stat label="승" value={stats.wins} />
            <Stat label="패" value={stats.losses} />
            <Stat label="무" value={stats.draws} />
          </div>
        </div>

        {/* 하단 요약 */}
        <div className="space-y-1.5 text-sm">
          {stats.peakElo !== null && (
            <SummaryRow label="🏔️ 기간 내 최고 ELO" value={`${Math.round(stats.peakElo)}`} />
          )}
          {stats.longestWinStreak >= 2 && <SummaryRow label="🔥 최다 연승" value={`${stats.longestWinStreak}연승`} />}
          {stats.bestPartner && (
            <SummaryRow
              label="🤝 최고의 파트너"
              value={`${data.nameById[stats.bestPartner.playerId] ?? "?"} · ${stats.bestPartner.winRate}% (${stats.bestPartner.total}경기 ${stats.bestPartner.wins}승)`}
            />
          )}
          {stats.bestOpponent && (
            <SummaryRow
              label="⭐ 최고 상대"
              value={`${data.nameById[stats.bestOpponent.playerId] ?? "?"} · ${stats.bestOpponent.winRate}% (${stats.bestOpponent.total}경기)`}
            />
          )}
          {stats.worstOpponent && stats.worstOpponent.playerId !== stats.bestOpponent?.playerId && (
            <SummaryRow
              label="😤 천적"
              value={`${data.nameById[stats.worstOpponent.playerId] ?? "?"} · ${stats.worstOpponent.winRate}% (${stats.worstOpponent.total}경기)`}
            />
          )}
        </div>

        <p className="text-center text-[9px] leading-tight whitespace-nowrap text-gray-400">
          Tennis DDI.
        </p>
      </div>
    </div>
  );
});

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="shrink-0 text-center">
      <p className="font-display leading-tight font-bold whitespace-nowrap" style={{ fontSize: "17px" }}>
        {value}
      </p>
      <p className="text-[9px] leading-tight whitespace-nowrap text-[#5f7b70]">{label}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    // 값(이름+통계)이 라벨보다 길어질 수 있어(예: "이름 · 100% (2경기 2승)")
    // truncate로 잘라내는 대신 break-keep으로 단어 중간이 아니라 공백/기호에서만
    // 줄바꿈되게 해서, 정보 손실 없이 2줄까지는 자연스럽게 넘어가게 한다.
    <div className="flex items-start justify-between gap-2 rounded-xl bg-white/70 px-3 py-2">
      <span className="shrink-0 text-xs leading-tight font-medium break-keep whitespace-nowrap text-[#5f7b70]">
        {label}
      </span>
      <span className="min-w-0 text-right text-xs leading-snug font-bold break-keep">{value}</span>
    </div>
  );
}
