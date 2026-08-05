import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { avatarSrc } from "@/lib/avatar";
import { getCurrentUser } from "@/lib/session";
import { DayParticipantsPreview } from "./DayParticipantsPreview";

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 8;

type Scope = "all" | "upcoming" | "past";
const SCOPE_TABS: { key: Scope; label: string }[] = [
  { key: "all", label: "전체 경기" },
  { key: "upcoming", label: "다가오는 경기" },
  { key: "past", label: "지난 경기" },
];

// "오늘"과 날짜 차이가 작을수록 먼저 보이도록(과거·미래 상관없이 오늘과
// 가까운 경기일이 위로) 정렬 기준을 명확히 보여주는 D-day 라벨.
function dDayLabel(diffDays: number): string {
  if (diffDays === 0) return "오늘";
  return diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;
}

function buildHref(scope: Scope, mine: boolean, limit?: number) {
  const params = new URLSearchParams();
  if (scope !== "upcoming") params.set("scope", scope);
  if (mine) params.set("mine", "1");
  if (limit && limit !== PAGE_SIZE) params.set("limit", String(limit));
  const qs = params.toString();
  return qs ? `/matches?${qs}` : "/matches";
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; mine?: string; limit?: string }>;
}) {
  const { scope: rawScope, mine: rawMine, limit: rawLimit } = await searchParams;
  const scope: Scope = rawScope === "all" || rawScope === "past" ? rawScope : "upcoming";
  const mineOnly = rawMine === "1";
  const parsedLimit = Number(rawLimit);
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : PAGE_SIZE;

  const user = await getCurrentUser();

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
  let daysWithDiff = days.map((d) => ({
    ...d,
    diffDays: Math.round((d.date.getTime() - today.getTime()) / DAY_MS),
  }));

  if (scope === "upcoming") daysWithDiff = daysWithDiff.filter((d) => d.diffDays >= 0);
  if (scope === "past") daysWithDiff = daysWithDiff.filter((d) => d.diffDays < 0);
  if (mineOnly && user) {
    daysWithDiff = daysWithDiff.filter((d) =>
      d.participants.some((p) => p.userId === user.id && p.status === "ATTENDING")
    );
  }

  daysWithDiff.sort((a, b) => Math.abs(a.diffDays) - Math.abs(b.diffDays) || a.diffDays - b.diffDays);

  const total = daysWithDiff.length;
  const visibleDays = daysWithDiff.slice(0, limit);
  const hasMore = total > visibleDays.length;

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h1 className="text-2xl font-bold">경기 목록</h1>
        <div className="flex flex-wrap justify-end gap-2">
          {SCOPE_TABS.map(({ key, label }) => (
            <Link
              key={key}
              href={buildHref(key, mineOnly)}
              aria-current={scope === key ? "page" : undefined}
              className={`tab-pill btn-press touch-target rounded-full px-4 py-2 text-sm font-medium ${
                scope === key ? "bg-primary text-white shadow-sm shadow-primary/30" : "bg-muted text-foreground/70"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {user && (
          <div className="flex justify-center sm:justify-start">
            <Link
              href={buildHref(scope, !mineOnly)}
              aria-pressed={mineOnly}
              className={`tab-pill btn-press touch-target rounded-full px-4 py-2 text-xs font-medium ${
                mineOnly ? "bg-accent/40 text-accent-foreground" : "bg-muted text-foreground/70"
              }`}
            >
              {mineOnly ? "✓ 내가 참여하는 경기만" : "내가 참여하는 경기만 보기"}
            </Link>
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground sm:text-left">
          오늘과 날짜 차이가 가까운 경기일 순으로 정렬됩니다.
        </p>
      </div>

      <ul className="space-y-3">
        {visibleDays.length === 0 && (
          <p className="text-sm text-muted-foreground">해당하는 경기일이 없습니다.</p>
        )}
        {visibleDays.map((d) => {
          const attending = d.participants
            .filter((p) => p.status === "ATTENDING")
            .map((p) => ({
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
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{d.date.toISOString().slice(0, 10)}</span>
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {dDayLabel(d.diffDays)}
                    </span>
                    {(d.time || d.location) && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {[d.time, d.location].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    경기 {d._count.matches}건
                  </span>
                </div>
                <DayParticipantsPreview participants={attending} />
              </Link>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <div className="flex justify-center">
          <Link
            href={buildHref(scope, mineOnly, limit + PAGE_SIZE)}
            className="btn-press touch-target rounded-full bg-muted px-6 py-2.5 text-sm font-medium text-foreground/70"
          >
            더보기 ({total - visibleDays.length}개 더 있음)
          </Link>
        </div>
      )}
    </main>
  );
}
