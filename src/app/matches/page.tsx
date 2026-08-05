import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { avatarSrc } from "@/lib/avatar";
import { CreateDayForm } from "./CreateDayForm";
import { DayParticipantsPreview } from "./DayParticipantsPreview";

const DAY_MS = 24 * 60 * 60 * 1000;

// "오늘"과 날짜 차이가 작을수록 먼저 보이도록(과거·미래 상관없이 오늘과
// 가까운 경기일이 위로) 정렬 기준을 명확히 보여주는 D-day 라벨.
function dDayLabel(diffDays: number): string {
  if (diffDays === 0) return "오늘";
  return diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;
}

export default async function MatchesPage() {
  const days = await prisma.matchDay.findMany({
    orderBy: { date: "desc" },
    include: {
      _count: { select: { matches: true } },
      participants: {
        include: {
          user: {
            select: { id: true, name: true, gender: true, profileImage: true, profileImageType: true },
          },
        },
      },
    },
  });

  const today = new Date(new Date().toISOString().slice(0, 10));
  const daysWithDiff = days
    .map((d) => ({ ...d, diffDays: Math.round((d.date.getTime() - today.getTime()) / DAY_MS) }))
    .sort((a, b) => Math.abs(a.diffDays) - Math.abs(b.diffDays) || a.diffDays - b.diffDays);

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <h1 className="text-2xl font-bold">경기 목록</h1>

      <CreateDayForm />

      <p className="text-xs text-muted-foreground">오늘과 날짜 차이가 가까운 경기일 순으로 정렬됩니다.</p>

      <ul className="space-y-3">
        {daysWithDiff.length === 0 && (
          <p className="text-sm text-muted-foreground">등록된 경기일이 없습니다.</p>
        )}
        {daysWithDiff.map((d) => {
          const participants = d.participants.map((p) => ({
            id: p.user.id,
            name: p.user.name,
            avatarSrc: avatarSrc(p.user),
          }));
          return (
            <li key={d.id}>
              <Link
                href={`/matches/${d.id}`}
                className="btn-press surface-card block space-y-2.5 px-5 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">{d.date.toISOString().slice(0, 10)}</span>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {dDayLabel(d.diffDays)}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    경기 {d._count.matches}건
                  </span>
                </div>
                <DayParticipantsPreview participants={participants} />
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
