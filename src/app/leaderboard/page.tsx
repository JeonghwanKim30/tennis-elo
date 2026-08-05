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

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ gender?: string }>;
}) {
  const { gender } = await searchParams;
  const genderFilter: GenderFilter = gender === "FEMALE" || gender === "MALE" ? gender : "ALL";

  const userSelect = { name: true, gender: true, profileImage: true, profileImageType: true } as const;

  const [singles, doubles] = await Promise.all([
    prisma.eloRating.findMany({
      where: { type: "SINGLES" },
      orderBy: { rating: "desc" },
      include: { user: { select: userSelect } },
    }),
    prisma.eloRating.findMany({
      where: { type: "DOUBLES" },
      orderBy: { rating: "desc" },
      include: { user: { select: userSelect } },
    }),
  ]);

  const filterRows = <T extends { user: { gender: string } }>(rows: T[]) =>
    genderFilter === "ALL" ? rows : rows.filter((r) => r.user.gender === genderFilter);

  return (
    <main className="mx-auto max-w-3xl space-y-10 px-4 py-12">
      <h1 className="text-2xl font-bold">리더보드</h1>

      <div className="flex justify-center gap-2 sm:justify-start">
        {GENDER_TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={key === "ALL" ? "/leaderboard" : `/leaderboard?gender=${key}`}
            className={`btn-press touch-target rounded-full px-4 py-2 text-sm font-medium ${
              genderFilter === key ? "bg-primary text-white shadow-sm shadow-primary/30" : "bg-muted text-foreground/70"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <RankingTable title="단식 랭킹" rows={filterRows(singles)} />
      <RankingTable title="복식 랭킹" rows={filterRows(doubles)} />
    </main>
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
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Avatar src={avatarSrc(r.user)} size="sm" />
                <span className="min-w-0 truncate font-medium">{r.user.name}</span>
              </div>
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
