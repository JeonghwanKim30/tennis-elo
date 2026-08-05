import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { avatarSrc } from "@/lib/avatar";
import { RESULT_LABEL } from "@/lib/matchDisplay";
import { PlayerBadge } from "@/components/PlayerBadge";
import { type TeamPlayer } from "@/components/TeamBadges";
import { MatchupRow } from "@/components/MatchupRow";
import type { ParticipationStatus } from "@/generated/prisma/client";
import { MatchComposerPanel } from "./MatchComposerPanel";
import { AttendanceCarousel } from "./AttendanceCarousel";
import { setParticipationStatusAction } from "./actions";

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
    include: { matches: { orderBy: { submittedAt: "asc" } } },
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

  const scheduled = day.matches.filter((m) => m.status === "PENDING");
  const completed = day.matches.filter((m) => m.status === "APPROVED");

  const rsvpFilter: ParticipationStatus | "ALL" =
    rsvp === "ATTENDING" || rsvp === "NOT_ATTENDING" || rsvp === "PENDING" ? rsvp : "ALL";
  const rsvpCounts = {
    ALL: members.length,
    ATTENDING: attendingMembers.length,
    NOT_ATTENDING: members.filter((m) => m.status === "NOT_ATTENDING").length,
    PENDING: members.filter((m) => m.status === "PENDING").length,
  };
  const visibleMembers = rsvpFilter === "ALL" ? members : members.filter((m) => m.status === rsvpFilter);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold">{day.date.toISOString().slice(0, 10)} 경기</h1>
        {(day.time || day.location) && (
          <p className="mt-1 text-sm text-muted-foreground">
            {day.time && <span>{day.time}</span>}
            {day.time && day.location && <span> · </span>}
            {day.location && <span>{day.location}</span>}
          </p>
        )}
      </div>

      <section className="surface-card p-5">
        <h2 className="mb-3 text-lg font-semibold">참석 여부</h2>

        <div className="mb-4 flex flex-wrap justify-center gap-2 sm:justify-start">
          {(["ALL", "ATTENDING", "NOT_ATTENDING", "PENDING"] as const).map((key) => (
            <Link
              key={key}
              href={key === "ALL" ? `/matches/${day.id}` : `/matches/${day.id}?rsvp=${key}`}
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
                      <PlayerBadge avatarSrc={m.avatarSrc} name={m.name} />
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
              return (
                <li key={m.id} className="surface-card px-5 py-4">
                  <p className="mb-2 text-sm text-muted-foreground">
                    {m.type === "SINGLES" ? "단식" : "복식"} · 점수 입력 대기 중
                  </p>
                  <MatchupRow type={m.type} teamA1={a1} teamA2={a2} teamB1={b1} teamB2={b2} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">완료된 경기</h2>
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
