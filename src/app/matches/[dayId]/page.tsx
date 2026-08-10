import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { avatarSrc } from "@/lib/avatar";
import { RESULT_LABEL } from "@/lib/matchDisplay";
import { PlayerBadge } from "@/components/PlayerBadge";
import { type TeamPlayer } from "@/components/TeamBadges";
import { MatchupRow } from "@/components/MatchupRow";
import { MatchScoreCard } from "@/components/MatchScoreCard";
import { getTier, type Tier } from "@/lib/tier";
import { computeDailyMvp } from "@/lib/mvp";
import type { MatchType, ParticipationStatus } from "@/generated/prisma/client";
import { MatchComposerPanel } from "./MatchComposerPanel";
import { AttendanceCarousel } from "./AttendanceCarousel";
import { MvpModal } from "./MvpModal";
import { MatchDayPhotoGallery } from "./MatchDayPhotoGallery";
import { setParticipationStatusAction, submitMatchScoreAction } from "./actions";

const RSVP_LABEL: Record<ParticipationStatus, string> = {
  ATTENDING: "참여",
  NOT_ATTENDING: "불참",
  PENDING: "미응답",
};
const RSVP_BADGE: Record<ParticipationStatus, string> = {
  ATTENDING: "bg-primary/10 text-primary",
  NOT_ATTENDING: "bg-destructive/10 text-destructive",
  PENDING: "bg-muted text-muted-foreground",
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

  const day = await prisma.matchDay.findUnique({
    where: { id: dayId },
    include: {
      matches: { orderBy: { submittedAt: "asc" } },
      photos: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!day) notFound();

  // 회원 전체(Users)를 기준으로 하고, 그날의 응답 기록(Attendants = MatchDayParticipant)을
  // LEFT JOIN 하듯 매핑한다 — 응답 기록이 없으면 "미응답"으로 취급.
  const [activeUsers, dayParticipants] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, gender: true, profileImage: true, profileImageType: true },
      orderBy: { name: "asc" },
    }),
    prisma.matchDayParticipant.findMany({ where: { matchDayId: dayId } }),
  ]);
  const statusByUserId = new Map(dayParticipants.map((p) => [p.userId, p.status]));

  // profileImage(Bytes)는 클라이언트 컴포넌트(MatchComposerPanel)로 넘어갈 수 없으므로
  // 문자열 avatarSrc로 미리 변환해둔다.
  const members: Member[] = activeUsers.map((u) => ({
    id: u.id,
    name: u.name,
    avatarSrc: avatarSrc(u),
    status: statusByUserId.get(u.id) ?? "PENDING",
  }));
  const playerById = new Map(members.map((m) => [m.id, m]));
  const attendingMembers: TeamPlayer[] = members.filter((m) => m.status === "ATTENDING");

  // 경기 카드에 선수별(단식/복식 종목에 맞는) 현재 티어를 색 링으로 보여주기 위해
  // 이 날짜에 등장하는 모든 회원의 EloRating을 미리 조회해둔다.
  const eloRatings = await prisma.eloRating.findMany({
    where: { userId: { in: members.map((m) => m.id) } },
  });
  const ratingByUserType = new Map(eloRatings.map((r) => [`${r.userId}_${r.type}`, r.rating]));
  function tierFor(userId: string, type: MatchType): Tier {
    return getTier(ratingByUserType.get(`${userId}_${type}`) ?? 1200);
  }

  const scheduled = day.matches.filter((m) => m.status === "PENDING");
  const completed = day.matches.filter((m) => m.status === "APPROVED");

  // 오늘의 MVP — 그날 완료된 경기들의 순 ELO 상승량 합계가 가장 높은 유저.
  const mvpResult = computeDailyMvp(completed);
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
      <div>
        <h1 className="text-2xl font-bold">{dateLabel} 경기</h1>
        {(day.time || day.location) && (
          <p className="mt-1 text-sm text-muted-foreground">
            {day.time && <span>{day.time}</span>}
            {day.time && day.location && <span> · </span>}
            {day.location && <span>{day.location}</span>}
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
              <div key={pageIndex} className="grid grid-cols-3 gap-3 sm:gap-4">
                {pageMembers.map((m) => {
                  const isSelf = user?.id === m.id;
                  const canEdit = !!user && (isSelf || user.role === "ADMIN");
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl p-2 ${
                        isSelf ? "bg-accent/15 ring-1 ring-accent" : ""
                      }`}
                    >
                      <PlayerBadge avatarSrc={m.avatarSrc} name={m.name} userId={m.id} />
                      {isSelf && <span className="text-[10px] font-medium text-muted-foreground">나</span>}
                      {canEdit ? (
                        <div className="flex gap-1">
                          <form action={setParticipationStatusAction.bind(null, day.id, m.id, "ATTENDING")}>
                            <button
                              className={`btn-press rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                m.status === "ATTENDING"
                                  ? "bg-primary text-white"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              참여
                            </button>
                          </form>
                          <form
                            action={setParticipationStatusAction.bind(null, day.id, m.id, "NOT_ATTENDING")}
                          >
                            <button
                              className={`btn-press rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                m.status === "NOT_ATTENDING"
                                  ? "bg-destructive text-white"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              불참
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${RSVP_BADGE[m.status]}`}
                        >
                          {RSVP_LABEL[m.status]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          />
        )}
      </section>

      {user && <MatchComposerPanel dayId={day.id} participants={attendingMembers} />}

      <section>
        <h2 className="mb-3 text-lg font-semibold">예정된 경기 ({scheduled.length})</h2>
        {scheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground">점수 입력을 기다리는 경기가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {scheduled.map((m) => {
              const a1 = playerById.get(m.teamAPlayer1);
              const a2 = m.teamAPlayer2 ? playerById.get(m.teamAPlayer2) : null;
              const b1 = playerById.get(m.teamBPlayer1);
              const b2 = m.teamBPlayer2 ? playerById.get(m.teamBPlayer2) : null;
              if (!a1 || !b1) return null;
              const typeLabel = m.type === "SINGLES" ? "단식" : "복식";
              const submitted = m.teamAScore !== null && m.teamBScore !== null;

              if (!user) {
                return (
                  <li key={m.id} className="surface-card px-5 py-4">
                    <p className="mb-2 text-sm text-muted-foreground">
                      {typeLabel} · 점수 입력 대기 중
                    </p>
                    <MatchupRow
                      type={m.type}
                      teamA1={a1}
                      teamA2={a2}
                      teamB1={b1}
                      teamB2={b2}
                      teamA1Tier={tierFor(a1.id, m.type)}
                      teamA2Tier={a2 ? tierFor(a2.id, m.type) : undefined}
                      teamB1Tier={tierFor(b1.id, m.type)}
                      teamB2Tier={b2 ? tierFor(b2.id, m.type) : undefined}
                    />
                  </li>
                );
              }

              return (
                <li key={m.id}>
                  <MatchScoreCard
                    action={submitMatchScoreAction.bind(null, m.id)}
                    type={m.type}
                    teamA1={a1}
                    teamA2={a2}
                    teamB1={b1}
                    teamB2={b2}
                    teamA1Tier={tierFor(a1.id, m.type)}
                    teamA2Tier={a2 ? tierFor(a2.id, m.type) : undefined}
                    teamB1Tier={tierFor(b1.id, m.type)}
                    teamB2Tier={b2 ? tierFor(b2.id, m.type) : undefined}
                    initialTeamAScore={m.teamAScore}
                    initialTeamBScore={m.teamBScore}
                    statusLabel={`${typeLabel} · ${submitted ? "제출됨 · 관리자 승인 대기" : "점수 입력 대기 중"}`}
                    submitLabel="결과 제출"
                  />
                </li>
              );
            })}
          </ul>
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
          <ul className="space-y-3">
            {completed.map((m) => {
              const a1 = playerById.get(m.teamAPlayer1);
              const a2 = m.teamAPlayer2 ? playerById.get(m.teamAPlayer2) : null;
              const b1 = playerById.get(m.teamBPlayer1);
              const b2 = m.teamBPlayer2 ? playerById.get(m.teamBPlayer2) : null;
              if (!a1 || !b1) return null;
              return (
                <li key={m.id} className="surface-card px-5 py-4">
                  <p className="mb-2 text-sm text-muted-foreground">
                    {m.type === "SINGLES" ? "단식" : "복식"}
                  </p>
                  <MatchupRow
                    type={m.type}
                    teamA1={a1}
                    teamA2={a2}
                    teamB1={b1}
                    teamB2={b2}
                    teamAEloChange={m.teamAEloChange}
                    teamBEloChange={m.teamBEloChange}
                    teamA1Tier={tierFor(a1.id, m.type)}
                    teamA2Tier={a2 ? tierFor(a2.id, m.type) : undefined}
                    teamB1Tier={tierFor(b1.id, m.type)}
                    teamB2Tier={b2 ? tierFor(b2.id, m.type) : undefined}
                    center={
                      <span className="font-medium">
                        {m.result ? RESULT_LABEL[m.result] : ""}
                        {m.teamAScore !== null && m.teamBScore !== null
                          ? ` (${m.teamAScore}:${m.teamBScore})`
                          : ""}
                      </span>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
