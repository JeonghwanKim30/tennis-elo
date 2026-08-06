import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { avatarSrc, type AvatarUser } from "@/lib/avatar";

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

function buildHref(type: RankingType, gender: GenderFilter) {
  const params = new URLSearchParams();
  if (type !== "SINGLES") params.set("type", type);
  if (gender !== "ALL") params.set("gender", gender);
  const qs = params.toString();
  return qs ? `/leaderboard?${qs}` : "/leaderboard";
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ gender?: string; type?: string }>;
}) {
  const { gender, type } = await searchParams;
  const genderFilter: GenderFilter = gender === "FEMALE" || gender === "MALE" ? gender : "ALL";
  const typeFilter: RankingType = type === "DOUBLES" ? "DOUBLES" : "SINGLES";

  const userSelect = { name: true, gender: true, profileImage: true, profileImageType: true } as const;
  // 탈퇴/추방 등으로 더 이상 활성 상태가 아닌 회원은 공개 랭킹에서 제외한다
  // (경기 이력/ELO 히스토리 자체는 그대로 보존된다).
  const activeFilter = { user: { status: "ACTIVE" as const } };

  const rows = await prisma.eloRating.findMany({
    where: { type: typeFilter, ...activeFilter },
    orderBy: { rating: "desc" },
    include: { user: { select: userSelect } },
  });

  const filterRows = <T extends { user: { gender: string } }>(rowsToFilter: T[]) =>
    genderFilter === "ALL" ? rowsToFilter : rowsToFilter.filter((r) => r.user.gender === genderFilter);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex flex-row flex-wrap items-center justify-between gap-2">
        <h1 className="shrink-0 text-2xl font-bold whitespace-nowrap">리더보드</h1>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {TYPE_TABS.map(({ key, label }) => (
            <Link
              key={key}
              href={buildHref(key, genderFilter)}
              aria-current={typeFilter === key ? "page" : undefined}
              className={`tab-pill btn-press touch-target rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:py-1.5 sm:text-sm ${
                typeFilter === key
                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                  : "bg-muted text-foreground/70"
              }`}
            >
              {label}
            </Link>
          ))}
          <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden="true" />
          <GenderTabs typeFilter={typeFilter} genderFilter={genderFilter} />
        </div>
      </div>

      <RankingTable title={typeFilter === "SINGLES" ? "단식 랭킹" : "복식 랭킹"} rows={filterRows(rows)} />
    </main>
  );
}

function GenderTabs({ typeFilter, genderFilter }: { typeFilter: RankingType; genderFilter: GenderFilter }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
      {GENDER_TABS.map(({ key, label }) => (
        <Link
          key={key}
          href={buildHref(typeFilter, key)}
          aria-current={genderFilter === key ? "page" : undefined}
          className={`tab-pill btn-press touch-target rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:py-1.5 sm:text-sm ${
            genderFilter === key ? "bg-primary text-white shadow-sm shadow-primary/30" : "bg-muted text-foreground/70"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

const RANK_BADGE = ["bg-gold text-accent-foreground", "bg-gray-200 text-gray-600", "bg-amber-200 text-amber-800"];

function RankingTable({
  title,
  rows,
}: {
  title: string;
  rows: {
    userId: string;
    rating: number;
    wins: number;
    losses: number;
    draws: number;
    user: AvatarUser & { name: string };
  }[];
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">등록된 선수가 없습니다.</p>
      ) : (
        // 표 대신 줄바꿈 가능한 행으로 구성해, 좁은 화면에서 열이 잘리거나
        // 가로 스크롤이 필요해지는 대신 내용이 자연스럽게 다음 줄로 넘어가게 한다.
        <div className="surface-card divide-y divide-border">
          {rows.map((r, i) => (
            <div key={r.userId} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm leading-none font-bold ${
                  i < 3 ? RANK_BADGE[i] : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <Link
                href={`/profile/${r.userId}`}
                className="btn-press flex min-w-0 flex-1 items-center gap-2"
              >
                <Avatar src={avatarSrc(r.user)} size="sm" />
                <span className="min-w-0 truncate font-medium">{r.user.name}</span>
              </Link>
              <span className="font-display shrink-0 text-lg leading-none font-semibold text-primary">
                {Math.round(r.rating)}
              </span>
              <span className="w-full shrink-0 pl-11 text-sm leading-relaxed text-muted-foreground sm:w-auto sm:pl-0">
                {r.wins}승 {r.losses}패 {r.draws}무
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
