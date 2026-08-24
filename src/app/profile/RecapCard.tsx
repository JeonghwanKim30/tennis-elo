import { forwardRef } from "react";
import { TeddiMark } from "@/components/TeddiMark";
import type { RecapCardData } from "./actions";

// 캡처(html-to-image)될 실제 카드 DOM. 화면에 보이는 미리보기와 다운로드되는
// PNG가 완전히 같은 노드이므로 여기 스타일이 곧 최종 이미지 결과다 — 고정
// 폭(360px, 픽셀 단위로 고정해 캡처 시 리플로우로 어긋나지 않게 한다)에 세로로
// 긴 카드로 잡아, 인스타/카톡 공유에 바로 쓰기 좋게 했다. 텍스트 줄바꿈으로
// 인한 레이아웃 깨짐을 막기 위해 이름/칭호/라벨류에는 whitespace-nowrap +
// break-keep(한글 단어 중간에서 안 끊기게) + leading-tight를 일관되게 적용한다.
export const RecapCard = forwardRef<HTMLDivElement, { data: RecapCardData }>(function RecapCard({ data }, ref) {
  const { stats } = data;
  const eloSign = stats.eloChange > 0 ? "+" : stats.eloChange < 0 ? "" : "±";
  const eloColor = stats.eloChange > 0 ? "#2fbf71" : stats.eloChange < 0 ? "#ef4444" : "#5f7b70";

  return (
    <div
      ref={ref}
      className="relative mx-auto overflow-hidden rounded-[2rem] p-6 text-[#1f3b30] shadow-xl"
      style={{
        width: "360px",
        boxSizing: "border-box",
        background: "linear-gradient(180deg, #eafcf1 0%, #f5fbf7 55%, #ffffff 100%)",
      }}
    >
      {/* 배경 장식 — 은은한 테니스공 실루엣 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-14 h-44 w-44 rounded-full opacity-[0.12]"
        style={{ background: "#2fbf71" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full opacity-[0.10]"
        style={{ background: "#5ec6f0" }}
      />

      <div className="relative space-y-5">
        {/* 상단: 로고 + 기간 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex shrink-0 items-center gap-1.5">
            <TeddiMark className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap text-sm font-bold tracking-wide text-[#2fbf71]">TEDDI.B</span>
          </div>
          <span className="min-w-0 truncate rounded-full bg-white/70 px-2.5 py-1 text-[11px] leading-tight font-medium break-keep text-[#5f7b70]">
            {data.periodLabel}
          </span>
        </div>

        {/* 프로필 */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.avatarSrc}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg leading-tight font-bold break-keep">{data.userName}</p>
            <span
              className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] leading-tight font-bold whitespace-nowrap"
              style={{ backgroundColor: data.tierColor, color: data.tierTextColor }}
            >
              {data.tierLabel}
            </span>
          </div>
        </div>

        {/* 칭호 배지 */}
        <div className="flex justify-center px-2">
          <span className="max-w-full truncate rounded-full bg-[#1f3b30] px-4 py-1.5 text-sm leading-tight font-bold whitespace-nowrap text-white">
            {stats.title.emoji} {stats.title.label}
          </span>
        </div>

        {/* 중앙 대형 스탯 */}
        <div className="rounded-3xl bg-white/80 p-5 text-center shadow-sm">
          <p className="leading-tight font-medium break-keep whitespace-nowrap text-[#5f7b70]" style={{ fontSize: "12px" }}>
            기간 내 ELO 변동
          </p>
          <p className="font-display leading-none font-extrabold whitespace-nowrap" style={{ color: eloColor, fontSize: "48px" }}>
            {eloSign}
            {stats.eloChange}
          </p>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs leading-tight font-medium whitespace-nowrap text-[#5f7b70]">
              <span>승률</span>
              <span>{stats.winRate}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#eaf6f0]">
              <div
                className="h-full rounded-full"
                style={{ width: `${stats.winRate}%`, background: "#2fbf71" }}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-center gap-6">
            <Stat label="경기" value={stats.totalMatches} />
            <Stat label="승" value={stats.wins} />
            <Stat label="패" value={stats.losses} />
            <Stat label="무" value={stats.draws} />
          </div>
        </div>

        {/* 하단 요약 */}
        <div className="space-y-2 text-sm">
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

        <p className="pt-1 text-center text-[10px] leading-tight whitespace-nowrap text-[#5f7b70]/80">
          테디베어 · 동호회 테니스 전적 관리
        </p>
      </div>
    </div>
  );
});

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="shrink-0 text-center">
      <p className="font-display leading-tight font-bold whitespace-nowrap" style={{ fontSize: "20px" }}>
        {value}
      </p>
      <p className="text-[10px] leading-tight whitespace-nowrap text-[#5f7b70]">{label}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    // 값(이름+통계)이 라벨보다 길어질 수 있어(예: "이름 · 100% (2경기 2승)")
    // truncate로 잘라내는 대신 break-keep으로 단어 중간이 아니라 공백/기호에서만
    // 줄바꿈되게 해서, 정보 손실 없이 2줄까지는 자연스럽게 넘어가게 한다.
    <div className="flex items-start justify-between gap-2 rounded-2xl bg-white/70 px-4 py-2.5">
      <span className="shrink-0 leading-tight font-medium break-keep whitespace-nowrap text-[#5f7b70]">{label}</span>
      <span className="min-w-0 text-right leading-snug font-bold break-keep">{value}</span>
    </div>
  );
}
