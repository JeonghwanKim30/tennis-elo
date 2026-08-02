import { prisma } from "@/lib/prisma";

export default async function LeaderboardPage() {
  const [singles, doubles] = await Promise.all([
    prisma.eloRating.findMany({
      where: { type: "SINGLES" },
      orderBy: { rating: "desc" },
      include: { user: { select: { name: true } } },
    }),
    prisma.eloRating.findMany({
      where: { type: "DOUBLES" },
      orderBy: { rating: "desc" },
      include: { user: { select: { name: true } } },
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

function RankingTable({
  title,
  rows,
}: {
  title: string;
  rows: { userId: string; rating: number; wins: number; losses: number; draws: number; user: { name: string } }[];
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">등록된 선수가 없습니다.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">순위</th>
              <th>이름</th>
              <th>ELO</th>
              <th>전적</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.userId} className="border-b">
                <td className="py-2">{i + 1}</td>
                <td>{r.user.name}</td>
                <td className="font-medium">{Math.round(r.rating)}</td>
                <td className="text-gray-500">
                  {r.wins}승 {r.losses}패 {r.draws}무
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
