import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { avatarSrc } from "@/lib/avatar";
import { CreateDayForm } from "./CreateDayForm";
import { DayParticipantsPreview } from "./DayParticipantsPreview";

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

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <h1 className="text-2xl font-bold">경기 목록</h1>

      <CreateDayForm />

      <ul className="space-y-3">
        {days.length === 0 && (
          <p className="text-sm text-muted-foreground">등록된 경기일이 없습니다.</p>
        )}
        {days.map((d) => {
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
                <div className="flex items-center justify-between">
                  <span className="font-medium">{d.date.toISOString().slice(0, 10)}</span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
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
