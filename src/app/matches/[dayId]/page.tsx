import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { avatarSrc } from "@/lib/avatar";
import { guestAvatarSrc } from "@/lib/playerDirectory";
import { RESULT_LABEL } from "@/lib/matchDisplay";
import { type TeamPlayer } from "@/components/TeamBadges";
import { getTier, type Tier } from "@/lib/tier";
import { computeDailyMvp } from "@/lib/mvp";
import type { MatchType, ParticipationStatus } from "@/generated/prisma/client";
import { MatchComposerPanel } from "./MatchComposerPanel";
import { AutoScheduleGenerator } from "./AutoScheduleGenerator";
import { AttendanceCarousel } from "./AttendanceCarousel";
import { AttendanceMemberGrid } from "./AttendanceMemberGrid";
import { MvpModal } from "./MvpModal";
import { MatchDayPhotoGallery } from "./MatchDayPhotoGallery";
import { EventGuestPanel } from "./EventGuestPanel";
import { EventTimelineBoard, type EventPlacedMatch } from "./EventTimelineBoard";
import { buildEventSlots } from "@/lib/eventSchedule";
import { ScheduledDayMatchList, type ScheduledDayMatchItem } from "./ScheduledDayMatchList";
import { CompletedDayMatchList, type CompletedDayMatchItem } from "./CompletedDayMatchList";
import { submitMatchScoreAction } from "./actions";
import { deleteMatchAction } from "@/app/admin/actions";

const RSVP_LABEL: Record<ParticipationStatus, string> = {
  ATTENDING: "참여",
  NOT_ATTENDING: "불참",
  PENDING: "미응답",
};
const ATTENDANCE_PAGE_SIZE = 9;

interface Member extends TeamPlayer {
  status: ParticipationStatus;
}

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

export default async function MatchDayPage({
  params,
  searchParams,
}: {
  params: Promise<{ dayId: string }>;
  searchParams: Promise<{ rsvp?: string }>;
}) {
  const { dayId } = await params;
  const { rsvp } = await searchParams;
  const user = await getCurrentUser();

  // 4개 쿼리 모두 서로 결과를 참조하지 않는다(day는 dayId만, 나머지는
  // 조건이 아예 없거나 dayId만 있으면 된다) — 순서대로 기다리면 원격 DB
  // 왕복이 그대로 쌓이므로 Promise.all로 한 번에 보낸다. eloRatings를
  // "이 날짜에 등장하는 회원 ID"로 필터링하지 않고 전체를 가져오는 것도
  // 같은 이유(그 ID 목록은 activeUsers 조회 결과가 나와야 알 수 있어서,
  // 필터링하려면 세 번째 왕복이 필요해진다)다.
  const [day, activeUsers, dayParticipants, eloRatings] = await Promise.all([
    prisma.matchDay.findUnique({
      where: { id: dayId },
      include: {
        matches: {
          orderBy: { submittedAt: "asc" },
          include: { eloHistory: { select: { userId: true, delta: true } } },
        },
        photos: { orderBy: { createdAt: "asc" } },
        // 특수 이벤트(MT/대회)에서만 채워져 있다 — 일반 경기일은 빈 배열.
        courts: { orderBy: { order: "asc" } },
        guests: { orderBy: { createdAt: "asc" } },
      },
    }),
    // 회원 전체(Users)를 기준으로 하고, 그날의 응답 기록(Attendants = MatchDayParticipant)을
    // LEFT JOIN 하듯 매핑한다 — 응답 기록이 없으면 "미응답"으로 취급.
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, gender: true, profileImage: true, profileImageType: true },
      orderBy: { name: "asc" },
    }),
    prisma.matchDayParticipant.findMany({ where: { matchDayId: dayId } }),
    // 경기 카드에 선수별(단식/복식 종목에 맞는) 현재 티어를 색 링으로 보여주기 위해
    // 전체 EloRating을 미리 조회해둔다.
    prisma.eloRating.findMany(),
  ]);
  if (!day) notFound();

  const statusByUserId = new Map(dayParticipants.map((p) => [p.userId, p.status]));

  // profileImage(Bytes)는 클라이언트 컴포넌트(MatchComposerPanel)로 넘어갈 수 없으므로
  // 문자열 avatarSrc로 미리 변환해둔다.
  const members: Member[] = activeUsers.map((u) => ({
    id: u.id,
    name: u.name,
    avatarSrc: avatarSrc(u),
    status: statusByUserId.get(u.id) ?? "PENDING",
  }));
  // 게스트도 회원과 같은 자리(Match.teamAPlayer* — FK가 아닌 String 컬럼)에
  // 들어가므로, 이름/아바타 조회용 맵에 반드시 함께 넣어야 한다. 넣지 않으면
  // 아래 경기 목록이 "모르는 id"로 보고 해당 경기를 통째로 걸러낸다(화면에서 사라짐).
  const guestPlayers: TeamPlayer[] = day.guests.map((g) => ({
    id: g.id,
    name: g.name,
    avatarSrc: guestAvatarSrc(g.gender),
  }));
  const playerById = new Map<string, TeamPlayer>([
    ...members.map((m) => [m.id, m] as const),
    ...guestPlayers.map((g) => [g.id, g] as const),
  ]);
  const attendingMembers: TeamPlayer[] = members.filter((m) => m.status === "ATTENDING");
  const isEvent = day.kind === "SPECIAL";

  const ratingByUserType = new Map(eloRatings.map((r) => [`${r.userId}_${r.type}`, r.rating]));
  function tierFor(userId: string, type: MatchType): Tier {
    return getTier(ratingByUserType.get(`${userId}_${type}`) ?? 1200);
  }

  const scheduled = day.matches.filter((m) => m.status === "PENDING");
  const completed = day.matches.filter((m) => m.status === "APPROVED");

  // 오늘의 MVP — 그날 완료된 경기들의 순 ELO 상승량 합계가 가장 높은 유저.
  const mvpResult = computeDailyMvp(
    completed.map((m) => ({
      ...m,
      eloChangeByPlayer: Object.fromEntries(m.eloHistory.map((h) => [h.userId, h.delta])),
    }))
  );
  const mvp = mvpResult ? playerById.get(mvpResult.userId) : null;
  const mvpTier = mvp
    ? getTier(
        Math.max(
          ratingByUserType.get(`${mvp.id}_SINGLES`) ?? 1200,
          ratingByUserType.get(`${mvp.id}_DOUBLES`) ?? 1200
        )
      )
    : null;

  const rsvpFilter: ParticipationStatus | "ALL" =
    rsvp === "ATTENDING" || rsvp === "NOT_ATTENDING" || rsvp === "PENDING" ? rsvp : "ALL";
  const rsvpCounts = {
    ALL: members.length,
    ATTENDING: attendingMembers.length,
    NOT_ATTENDING: members.filter((m) => m.status === "NOT_ATTENDING").length,
    PENDING: members.filter((m) => m.status === "PENDING").length,
  };
  const visibleMembers = rsvpFilter === "ALL" ? members : members.filter((m) => m.status === rsvpFilter);
  const dateLabel = day.date.toISOString().slice(0, 10);
  const photos = day.photos.map((p) => ({
    id: p.id,
    src: `data:${p.imageType};base64,${Buffer.from(p.image).toString("base64")}`,
  }));

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      {/* 이벤트는 제목이 주인공이고 날짜·진행시간·코트 수가 부제가 된다.
          일반 경기일은 기존처럼 날짜가 제목이다. */}
      <div className={isEvent ? "surface-card event-card px-5 py-4" : undefined}>
        {isEvent && (
          <span className="mb-1 inline-block rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-bold text-amber-900">
            🎪 특수 이벤트
          </span>
        )}
        <h1 className="text-2xl font-bold">{isEvent ? day.title : `${dateLabel} 경기`}</h1>
        {isEvent ? (
          <p className="mt-1 text-sm text-amber-900/80">
            {[
              dateLabel,
              day.startTime && day.endTime ? `${day.startTime}~${day.endTime}` : null,
              day.courts.length > 0 ? `${day.courts.length}코트` : null,
              day.plannedMatchCount ? `${day.plannedMatchCount}경기` : null,
              day.location,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : (
          (day.time || day.location) && (
            <p className="mt-1 text-sm text-muted-foreground">
              {day.time && <span>{day.time}</span>}
              {day.time && day.location && <span> · </span>}
              {day.location && <span>{day.location}</span>}
            </p>
          )
        )}
        {isEvent && day.eloMode === "NONE" && (
          <p className="mt-2 text-xs text-amber-900/70">
            이 이벤트의 경기 결과는 기록만 남고 ELO 레이팅에는 반영되지 않습니다.
          </p>
        )}
      </div>

      <MatchDayPhotoGallery dayId={day.id} dateLabel={dateLabel} initialPhotos={photos} canManage={!!user} />

      <section className="surface-card p-5">
        <h2 className="mb-3 text-lg font-semibold">참석 여부</h2>

        <div className="mb-4 flex flex-wrap justify-center gap-2 sm:justify-start">
          {(["ALL", "ATTENDING", "NOT_ATTENDING", "PENDING"] as const).map((key) => (
            <Link
              key={key}
              href={key === "ALL" ? `/matches/${day.id}` : `/matches/${day.id}?rsvp=${key}`}
              scroll={false}
              aria-current={rsvpFilter === key ? "page" : undefined}
              className={`tab-pill btn-press touch-target rounded-full px-3 py-1.5 text-xs font-medium ${
                rsvpFilter === key ? "bg-primary text-white" : "bg-muted text-foreground/70"
              }`}
            >
              {key === "ALL" ? "전체" : RSVP_LABEL[key]} {rsvpCounts[key]}
            </Link>
          ))}
        </div>

        {visibleMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">해당하는 회원이 없습니다.</p>
        ) : (
          <AttendanceCarousel
            key={rsvpFilter}
            pages={chunk(visibleMembers, ATTENDANCE_PAGE_SIZE).map((pageMembers, pageIndex) => (
              <AttendanceMemberGrid
                key={pageIndex}
                dayId={day.id}
                members={pageMembers.map((m) => ({
                  id: m.id,
                  name: m.name,
                  avatarSrc: m.avatarSrc,
                  status: m.status,
                  isSelf: user?.id === m.id,
                  canEdit: !!user && (user.id === m.id || user.role === "ADMIN"),
                }))}
              />
            ))}
          />
        )}
      </section>

      {/* 특수 이벤트는 게스트 명단 + 타임라인 수동 배치로 대진을 만든다.
          일반 경기일의 자동 대진표/수동 경기 추가는 코트·시간대 개념이 없어
          타임라인에 올라가지 않으므로 이벤트에서는 보여주지 않는다. */}
      {isEvent ? (
        <>
          <EventGuestPanel
            dayId={day.id}
            guests={day.guests.map((g) => ({
              id: g.id,
              name: g.name,
              avatarSrc: guestAvatarSrc(g.gender),
              genderLabel: g.gender === "FEMALE" ? "여성" : "남성",
              mmr: Math.round(g.mmr),
            }))}
            canManage={user?.role === "ADMIN"}
          />

          <EventTimelineBoard
            dayId={day.id}
            courts={day.courts.map((c) => ({ id: c.id, name: c.name }))}
            slots={buildEventSlots({
              startTime: day.startTime,
              endTime: day.endTime,
              plannedMatchCount: day.plannedMatchCount,
              courtCount: day.courts.length,
            })}
            plannedMatchCount={day.plannedMatchCount ?? 0}
            players={[
              ...attendingMembers.map((m) => ({ ...m, isGuest: false })),
              ...guestPlayers.map((g) => ({ ...g, isGuest: true })),
            ]}
            placed={day.matches
              .map((m): EventPlacedMatch | null => {
                const a1 = playerById.get(m.teamAPlayer1);
                const a2 = m.teamAPlayer2 ? playerById.get(m.teamAPlayer2) : null;
                const b1 = playerById.get(m.teamBPlayer1);
                const b2 = m.teamBPlayer2 ? playerById.get(m.teamBPlayer2) : null;
                if (!a1 || !b1) return null;
                return {
                  id: m.id,
                  courtId: m.courtId,
                  slotIndex: m.slotIndex,
                  type: m.type,
                  teamAPlayer1: m.teamAPlayer1,
                  teamAPlayer2: m.teamAPlayer2,
                  teamBPlayer1: m.teamBPlayer1,
                  teamBPlayer2: m.teamBPlayer2,
                  teamA1: a1,
                  teamA2: a2,
                  teamB1: b1,
                  teamB2: b2,
                  isLocked: m.status !== "PENDING",
                  resultLabel: m.result ? RESULT_LABEL[m.result] : undefined,
                  scoreLabel:
                    m.teamAScore !== null && m.teamBScore !== null
                      ? `(${m.teamAScore}:${m.teamBScore})`
                      : undefined,
                };
              })
              .filter((m): m is EventPlacedMatch => m !== null)}
            canManage={user?.role === "ADMIN"}
            deleteAction={deleteMatchAction}
          />
        </>
      ) : (
        <>
          {user?.role === "ADMIN" && (
            <AutoScheduleGenerator dayId={day.id} participants={attendingMembers} />
          )}

          {user && <MatchComposerPanel dayId={day.id} participants={attendingMembers} />}
        </>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">예정된 경기 ({scheduled.length})</h2>
        {scheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground">점수 입력을 기다리는 경기가 없습니다.</p>
        ) : (
          <ScheduledDayMatchList
            items={scheduled
              .map((m): ScheduledDayMatchItem | null => {
                const a1 = playerById.get(m.teamAPlayer1);
                const a2 = m.teamAPlayer2 ? playerById.get(m.teamAPlayer2) : null;
                const b1 = playerById.get(m.teamBPlayer1);
                const b2 = m.teamBPlayer2 ? playerById.get(m.teamBPlayer2) : null;
                if (!a1 || !b1) return null;
                const typeLabel = m.type === "SINGLES" ? "단식" : "복식";
                const submitted = m.teamAScore !== null && m.teamBScore !== null;
                const teamA1Tier = tierFor(a1.id, m.type);
                const teamA2Tier = a2 ? tierFor(a2.id, m.type) : undefined;
                const teamB1Tier = tierFor(b1.id, m.type);
                const teamB2Tier = b2 ? tierFor(b2.id, m.type) : undefined;

                return {
                  id: m.id,
                  type: m.type,
                  teamA1: a1,
                  teamA2: a2,
                  teamB1: b1,
                  teamB2: b2,
                  teamA1Tier,
                  teamA2Tier,
                  teamB1Tier,
                  teamB2Tier,
                  typeLabel,
                  statusLabel: `${typeLabel} · ${submitted ? "제출됨 · 관리자 승인 대기" : "점수 입력 대기 중"}`,
                  initialTeamAScore: m.teamAScore,
                  initialTeamBScore: m.teamBScore,
                  action: user ? submitMatchScoreAction.bind(null, m.id) : undefined,
                  deleteAction: user?.role === "ADMIN" ? deleteMatchAction.bind(null, m.id) : undefined,
                };
              })
              .filter((item): item is ScheduledDayMatchItem => item !== null)}
          />
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">완료된 경기</h2>
          {mvp && mvpResult && mvpTier && (
            <MvpModal
              dateLabel={day.date.toISOString().slice(0, 10)}
              name={mvp.name}
              avatarSrc={mvp.avatarSrc}
              tier={mvpTier}
              totalEloGain={mvpResult.totalEloGain}
              wins={mvpResult.wins}
              losses={mvpResult.losses}
            />
          )}
        </div>
        {completed.length === 0 ? (
          <p className="text-sm text-muted-foreground">완료된 경기가 없습니다.</p>
        ) : (
          <CompletedDayMatchList
            items={completed
              .map((m): CompletedDayMatchItem | null => {
                const a1 = playerById.get(m.teamAPlayer1);
                const a2 = m.teamAPlayer2 ? playerById.get(m.teamAPlayer2) : null;
                const b1 = playerById.get(m.teamBPlayer1);
                const b2 = m.teamBPlayer2 ? playerById.get(m.teamBPlayer2) : null;
                if (!a1 || !b1) return null;
                const eloChangeByPlayer = Object.fromEntries(m.eloHistory.map((h) => [h.userId, h.delta]));
                return {
                  id: m.id,
                  type: m.type,
                  typeLabel: m.type === "SINGLES" ? "단식" : "복식",
                  teamA1: a1,
                  teamA2: a2,
                  teamB1: b1,
                  teamB2: b2,
                  teamA1Tier: tierFor(a1.id, m.type),
                  teamA2Tier: a2 ? tierFor(a2.id, m.type) : undefined,
                  teamB1Tier: tierFor(b1.id, m.type),
                  teamB2Tier: b2 ? tierFor(b2.id, m.type) : undefined,
                  eloChangeByPlayer,
                  resultLabel: m.result ? RESULT_LABEL[m.result] : undefined,
                  scoreLabel:
                    m.teamAScore !== null && m.teamBScore !== null ? `(${m.teamAScore}:${m.teamBScore})` : undefined,
                };
              })
              .filter((item): item is CompletedDayMatchItem => item !== null)}
          />
        )}
      </section>
    </main>
  );
}
