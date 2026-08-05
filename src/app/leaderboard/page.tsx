import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { avatarSrc, type AvatarUser } from "@/lib/avatar";

export default async function LeaderboardPage() {
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

  return (
    <main className="mx-auto max-w-3xl space-y-10 px-4 py-12">
      <h1 className="text-2xl font-bold">리더보드</h1>
      <RankingTable title="단식 랭킹" rows={singles} />
      <RankingTable title="복식 랭킹" rows={doubles} />
    </main>
  );
}

const RANK_BADGE = ["bg-secondary text-secondary-foreground", "bg-gray-200 text-gray-600", "bg-amber-200 text-amber-800"];

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
        <div className="surface-card overflow-hidden p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">순위</th>
                <th className="font-medium">이름</th>
                <th className="font-medium">ELO</th>
                <th className="font-medium">전적</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.userId} className="border-t border-border first:border-t-0">
                  <td className="px-3 py-2.5">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        i < 3 ? RANK_BADGE[i] : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar src={avatarSrc(r.user)} size="sm" />
                      <span>{r.user.name}</span>
                    </div>
                  </td>
                  <td className="font-display text-base font-semibold text-primary">
                    {Math.round(r.rating)}
                  </td>
                  <td className="text-muted-foreground">
                    {r.wins}승 {r.losses}패 {r.draws}무
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
