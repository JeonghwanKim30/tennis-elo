import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { avatarSrc } from "@/lib/avatar";
import { getCurrentUser } from "@/lib/session";
import { deleteMatchDayAction } from "@/app/admin/actions";
import { kstToday } from "@/lib/date";
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

// tabFilter(scope)와 isMyOnly(mine)는 서로 완전히 독립적인 상태다 — 한쪽을
// 바꾼다고 다른 쪽 값을 절대 바꾸거나 초기화하지 않는다("다가오는 경기" 탭에
// 머문 채로 필터를 켜고 꺼도 탭이 "전체 경기"로 튕기지 않아야 함). "다가오는
// 경기"가 기본값이라 URL에서는 생략된다.
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
  const mineOnly = rawMine === "1";
  const scope: Scope = rawScope === "all" || rawScope === "past" ? rawScope : "upcoming";
  const parsedLimit = Number(rawLimit);
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : PAGE_SIZE;

  const user = await getCurrentUser();
  // 한국 시간(KST) 기준 자정에 날짜가 바뀌어야 한다 — UTC 기준으로 계산하면
  // KST 00:00~09:00 사이에는 여전히 "어제"로 취급돼 다가오는/지난 경기 구분이
  // 어긋난다(lib/date.ts 참고).
  const today = kstToday();

  // scope(탭)는 그대로 결과에 반영되는 조건이라 DB where 절로 옮겨도 최종
  // 목록은 동일하다 — 다만 지난/다가오는 경기 중 안 쓰는 절반을 애초에
  // DB에서부터 안 끌어와서(참가자·사진 include까지) 매번 전체 이력을 다
  // 가져오던 것보다 훨씬 가볍다.
  const days = await prisma.matchDay.findMany({
    where:
      scope === "upcoming"
        ? { date: { gte: today } }
        : scope === "past"
          ? { date: { lt: today } }
          : undefined,
    orderBy: { date: "desc" },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, name: true, gender: true, profileImage: true, profileImageType: true },
          },
        },
      },
      photos: { orderBy: { createdAt: "asc" }, take: 1 },
      _count: { select: { photos: true } },
    },
  });

  const daysWithDiff = days.map((d) => ({
    ...d,
    diffDays: Math.round((d.date.getTime() - today.getTime()) / DAY_MS),
  }));

  // "내가 참여하는 경기만"(mine) 필터 — scope와 서로 독립적인 조건이라 이미
  // DB에서 걸러진 scope 결과 위에 교집합(AND)으로 한 번 더 좁히기만 하면 된다.
  const filteredDays = mineOnly && user
    ? daysWithDiff.filter((d) => d.participants.some((p) => p.userId === user.id && p.status === "ATTENDING"))
    : daysWithDiff;

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
                scroll={false}
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
            {/* scope는 그대로 두고 mine만 뒤집는다 — 탭 선택은 절대 건드리지 않는다. */}
            <Link
              href={buildHref(scope, !mineOnly)}
              scroll={false}
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
          thumbnailSrc: d.photos[0]
            ? `data:${d.photos[0].imageType};base64,${Buffer.from(d.photos[0].image).toString("base64")}`
            : null,
          photoCount: d._count.photos,
        }))}
        isAdmin={user?.role === "ADMIN"}
        deleteAction={deleteMatchDayAction}
      />

      {hasMore && (
        <div className="flex justify-center">
          <Link
            href={buildHref(scope, mineOnly, limit + PAGE_SIZE)}
            scroll={false}
            className="btn-press touch-target rounded-full bg-muted px-6 py-2.5 text-sm font-medium text-foreground/70"
          >
            더보기 ({total - visibleDays.length}개 더 있음)
          </Link>
        </div>
      )}
    </main>
  );
}
