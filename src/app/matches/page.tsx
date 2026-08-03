import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CreateDayForm } from "./CreateDayForm";

export default async function MatchesPage() {
  const days = await prisma.matchDay.findMany({
    orderBy: { date: "desc" },
    include: {
      _count: { select: { participants: true, matches: true } },
    },
  });

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <h1 className="text-2xl font-bold">경기 목록</h1>

      <CreateDayForm />

      <ul className="space-y-2">
        {days.length === 0 && (
          <p className="text-sm text-gray-500">등록된 경기일이 없습니다.</p>
        )}
        {days.map((d) => (
          <li key={d.id}>
            <Link
              href={`/matches/${d.id}`}
              className="flex items-center justify-between rounded border px-4 py-3 hover:bg-green-50"
            >
              <span className="font-medium">{d.date.toISOString().slice(0, 10)}</span>
              <span className="text-sm text-gray-500">
                참가자 {d._count.participants}명 · 경기 {d._count.matches}건
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
