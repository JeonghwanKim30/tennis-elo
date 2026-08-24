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

// scope(전체/다가오는/지난)만 URL로 관리한다 — 이 값을 바꾸면 DB where
// 절 자체가 달라져(genuinely 다른 쿼리) 서버 왕복이 필요하다. "내가 참여하는
// 경기만"과 "더보기" 페이지네이션은 이미 받은 목록 안에서의 순수 필터/자르기라
// MatchDayList(클라이언트)에서 즉시 처리한다.
function buildScopeHref(scope: Scope) {
  return scope === "upcoming" ? "/matches" : `/matches?scope=${scope}`;
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope: rawScope } = await searchParams;
  const scope: Scope = rawScope === "all" || rawScope === "past" ? rawScope : "upcoming";

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

  daysWithDiff.sort((a, b) => Math.abs(a.diffDays) - Math.abs(b.diffDays) || a.diffDays - b.diffDays);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="space-y-3">
        <div className="flex w-full flex-nowrap items-center justify-between gap-2">
          <h1 className="shrink-0 text-xl font-bold whitespace-nowrap sm:text-2xl">경기 목록</h1>
          <div className="flex flex-nowrap items-center justify-end gap-1 sm:gap-2">
            {SCOPE_TABS.map(({ key, label }) => (
              <Link
                key={key}
                href={buildScopeHref(key)}
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

        <p className="text-center text-xs text-muted-foreground sm:text-left">
          오늘과 날짜 차이가 가까운 경기일 순으로 정렬됩니다.
        </p>
      </div>

      <MatchDayList
        key={scope}
        days={daysWithDiff.map((d) => ({
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
        currentUserId={user?.id}
        pageSize={PAGE_SIZE}
      />
    </main>
  );
}
