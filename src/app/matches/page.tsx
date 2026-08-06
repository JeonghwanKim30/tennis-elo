import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { avatarSrc } from "@/lib/avatar";
import { getCurrentUser } from "@/lib/session";
import { deleteMatchDayAction } from "@/app/admin/actions";
import { MatchDayList } from "./MatchDayList";

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

// "내가 참여하는 경기만" 필터가 꺼져 있을 때는 지금까지처럼 "다가오는 경기"가
// 기본값이지만, 필터가 켜져 있을 때는 "전체 경기"가 기본값이다 — 그렇지 않으면
// 사용자가 참여 중인 지난 경기일이 scope=upcoming과 암묵적으로 AND 결합되어
// 조용히 목록에서 빠지는 문제가 있었다(아래 필터링 로직 참고).
function defaultScopeFor(mine: boolean): Scope {
  return mine ? "all" : "upcoming";
}

function buildHref(scope: Scope, mine: boolean, limit?: number) {
  const params = new URLSearchParams();
  if (scope !== defaultScopeFor(mine)) params.set("scope", scope);
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
  const mineOnly = rawMine === "1";
  const explicitScope = rawScope === "all" || rawScope === "upcoming" || rawScope === "past";
  const scope: Scope = explicitScope ? (rawScope as Scope) : defaultScopeFor(mineOnly);
  const parsedLimit = Number(rawLimit);
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : PAGE_SIZE;

  const user = await getCurrentUser();

  const days = await prisma.matchDay.findMany({
    orderBy: { date: "desc" },
    include: {
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
  const daysWithDiff = days.map((d) => ({
    ...d,
    diffDays: Math.round((d.date.getTime() - today.getTime()) / DAY_MS),
  }));

  // 선(先) "내가 참여하는 경기" 필터 -> 후(後) 날짜 범위(scope) 필터 순으로 적용한다.
  // 참여 필터를 먼저 걸어 로그인한 유저가 ATTENDING으로 응답한 경기일을 전부
  // 추려낸 뒤에만 scope로 좁히므로, mine=1인데 scope가 명시되지 않은 경우
  // (기본값이 "전체 경기"로 바뀐다) 지난 경기든 다가오는 경기든 빠짐없이 보인다.
  let filteredDays = mineOnly && user
    ? daysWithDiff.filter((d) => d.participants.some((p) => p.userId === user.id && p.status === "ATTENDING"))
    : daysWithDiff;

  if (scope === "upcoming") filteredDays = filteredDays.filter((d) => d.diffDays >= 0);
  if (scope === "past") filteredDays = filteredDays.filter((d) => d.diffDays < 0);

  filteredDays.sort((a, b) => Math.abs(a.diffDays) - Math.abs(b.diffDays) || a.diffDays - b.diffDays);

  const total = filteredDays.length;
  const visibleDays = filteredDays.slice(0, limit);
  const hasMore = total > visibleDays.length;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="space-y-3">
        <div className="flex w-full flex-nowrap items-center justify-between gap-2">
          <h1 className="shrink-0 text-xl font-bold whitespace-nowrap sm:text-2xl">경기 목록</h1>
          <div className="flex flex-nowrap items-center justify-end gap-1 sm:gap-2">
            {SCOPE_TABS.map(({ key, label }) => (
              <Link
                key={key}
                href={buildHref(key, mineOnly)}
                aria-current={scope === key ? "page" : undefined}
                className={`tab-pill btn-press touch-target rounded-full px-2 py-1 text-[11px] font-medium whitespace-nowrap sm:px-3 sm:py-1.5 sm:text-sm ${
                  scope === key ? "bg-primary text-white shadow-sm shadow-primary/30" : "bg-muted text-foreground/70"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {user && (
          <div className="flex justify-center sm:justify-start">
            {/*
              필터를 켤 때는 현재 선택된 scope 탭을 그대로 들고 가지 않고 항상
              "전체 경기"로 초기화한다 — 그렇지 않으면 "다가오는 경기" 탭에
              머문 채로 필터를 켰을 때 이미 참여 중인 지난 경기일이 조용히
              가려지는 문제가 있었다. 끌 때는 보고 있던 scope를 그대로 유지한다.
            */}
            <Link
              href={mineOnly ? buildHref(scope, false) : buildHref("all", true)}
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

      <MatchDayList
        key={`${scope}-${mineOnly}-${limit}`}
        days={visibleDays.map((d) => ({
          id: d.id,
          dateLabel: d.date.toISOString().slice(0, 10),
          dDayLabel: dDayLabel(d.diffDays),
          time: d.time,
          location: d.location,
          attending: d.participants
            .filter((p) => p.status === "ATTENDING")
            .map((p) => ({
              id: p.user.id,
              name: p.user.name,
              avatarSrc: avatarSrc(p.user),
            })),
        }))}
        isAdmin={user?.role === "ADMIN"}
        deleteAction={deleteMatchDayAction}
      />

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
