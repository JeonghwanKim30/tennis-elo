"use client";

import { memo, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { TierBadge, PlacementBadge } from "@/components/TierBadge";
import { avatarSrc, type AvatarUser } from "@/lib/avatar";
import { getTier, isPlacement, compareForRanking } from "@/lib/tier";

type GenderFilter = "ALL" | "FEMALE" | "MALE";
const GENDER_TABS: { key: GenderFilter; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "FEMALE", label: "여성" },
  { key: "MALE", label: "남성" },
];

type RankingType = "SINGLES" | "DOUBLES";
const TYPE_TABS: { key: RankingType; label: string }[] = [
  { key: "SINGLES", label: "단식 랭킹" },
  { key: "DOUBLES", label: "복식 랭킹" },
];

export interface LeaderboardRow {
  userId: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  user: AvatarUser & { name: string };
}

// 단식/복식 필터는 서버에서 두 종목 데이터를 한 번에 미리 받아두고, 성별
// 필터는 애초에 서버 왕복 없이도 계산 가능한 순수 배열 필터라 여기서 전부
// useState/useMemo로 클라이언트 메모리 안에서 처리한다 — 예전엔 필터 탭이
// <Link>였어서 단식↔복식/전체↔여성↔남성 어느 쪽을 눌러도 매번 서버에
// 새로 왕복해 원격 DB 쿼리를 다시 태웠다(왕복 1회에 1.5~3초, 필터 자체는
// 이미 갖고 있는 데이터에 대한 단순 배열 연산인데도).
export function LeaderboardClient({
  singlesRows,
  doublesRows,
}: {
  singlesRows: LeaderboardRow[];
  doublesRows: LeaderboardRow[];
}) {
  const [type, setType] = useState<RankingType>("SINGLES");
  const [gender, setGender] = useState<GenderFilter>("ALL");

  // 원본 데이터(singlesRows/doublesRows)나 필터 조건(type/gender)이 바뀔
  // 때만 정렬+필터를 다시 계산한다. 탭 전환처럼 리렌더가 잦은 화면에서
  // 매 렌더마다 sort+filter를 새로 도는 걸 막아준다.
  const rows = useMemo(() => {
    const base = type === "SINGLES" ? singlesRows : doublesRows;
    const sorted = [...base].sort(compareForRanking);
    return gender === "ALL" ? sorted : sorted.filter((r) => r.user.gender === gender);
  }, [type, gender, singlesRows, doublesRows]);

  const handleTypeChange = useCallback((key: RankingType) => setType(key), []);
  const handleGenderChange = useCallback((key: GenderFilter) => setGender(key), []);

  return (
    <>
      <div className="flex flex-row flex-wrap items-center justify-between gap-2">
        <h1 className="shrink-0 text-2xl font-bold whitespace-nowrap">리더보드</h1>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {TYPE_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTypeChange(key)}
              aria-current={type === key ? "page" : undefined}
              className={`tab-pill btn-press touch-target rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:py-1.5 sm:text-sm ${
                type === key ? "bg-primary text-white shadow-sm shadow-primary/30" : "bg-muted text-foreground/70"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden="true" />
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            {GENDER_TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleGenderChange(key)}
                aria-current={gender === key ? "page" : undefined}
                className={`tab-pill btn-press touch-target rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:py-1.5 sm:text-sm ${
                  gender === key ? "bg-primary text-white shadow-sm shadow-primary/30" : "bg-muted text-foreground/70"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <RankingTable title={type === "SINGLES" ? "단식 랭킹" : "복식 랭킹"} rows={rows} />
    </>
  );
}

const RANK_BADGE = ["bg-gold text-accent-foreground", "bg-gray-200 text-gray-600", "bg-amber-200 text-amber-800"];

function RankingTable({ title, rows }: { title: string; rows: LeaderboardRow[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">등록된 선수가 없습니다.</p>
      ) : (
        <div className="surface-card min-h-[160px] divide-y divide-border">
          {rows.map((r, i) => (
            <LeaderboardRowItem key={r.userId} row={r} rank={i} />
          ))}
        </div>
      )}
    </section>
  );
}

// 필터가 바뀌어도 순위가 바뀌지 않은 행은 다시 그리지 않도록 React.memo로
// 감싼다 — 리더보드는 회원이 늘수록 행 개수가 그대로 늘어나는 리스트라,
// 필터 전환마다 수십~수백 행을 통째로 재렌더링하면 그 자체가 버벅임의
// 원인이 된다.
const LeaderboardRowItem = memo(function LeaderboardRowItem({ row, rank }: { row: LeaderboardRow; rank: number }) {
  const totalMatches = row.wins + row.losses + row.draws;
  const placement = isPlacement(totalMatches);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm leading-none font-bold ${
          !placement && rank < 3 ? RANK_BADGE[rank] : "bg-muted text-muted-foreground"
        }`}
      >
        {placement ? "-" : rank + 1}
      </span>
      <Link href={`/profile/${row.userId}`} className="btn-press flex min-w-0 flex-1 items-center gap-2">
        <Avatar src={avatarSrc(row.user)} size="sm" />
        <span className="min-w-0 truncate font-medium">{row.user.name}</span>
        {placement ? <PlacementBadge size="sm" /> : <TierBadge tier={getTier(row.rating)} size="sm" />}
      </Link>
      <span
        className={`font-display shrink-0 text-lg leading-none font-semibold ${
          placement ? "text-sm text-muted-foreground" : "text-primary"
        }`}
      >
        {placement ? "배치 중" : Math.round(row.rating)}
      </span>
      <span className="w-full shrink-0 pl-11 text-sm leading-relaxed text-muted-foreground sm:w-auto sm:pl-0">
        {row.wins}승 {row.losses}패 {row.draws}무
      </span>
    </div>
  );
});
