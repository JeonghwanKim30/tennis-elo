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
import { ParticipantManager } from "./ParticipantManager";
import { MatchComposerPanel } from "./MatchComposerPanel";
import { removeParticipantAction, setParticipationStatusAction } from "./actions";

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
      participants: {
        include: {
          user: {
            select: { id: true, name: true, gender: true, profileImage: true, profileImageType: true },
          },
        },
      },
      matches: { orderBy: { submittedAt: "asc" } },
    },
  });
  if (!day) notFound();

  // profileImage(Bytes)는 클라이언트 컴포넌트(MatchComposerPanel)로 넘어갈 수 없으므로
  // 문자열 avatarSrc로 미리 변환해둔다.
  const participants: TeamPlayer[] = day.participants.map((p) => ({
    id: p.user.id,
    name: p.user.name,
    avatarSrc: avatarSrc(p.user),
  }));
  const participantIds = new Set(participants.map((p) => p.id));
  const playerById = new Map(participants.map((p) => [p.id, p]));
  const statusByUserId = new Map(day.participants.map((p) => [p.userId, p.status]));

  const activeUsers = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const addablePlayers = activeUsers.filter((u) => !participantIds.has(u.id));

  const scheduled = day.matches.filter((m) => m.status === "PENDING");
  const completed = day.matches.filter((m) => m.status === "APPROVED");

  const isAdmin = user?.role === "ADMIN";
  const rsvpFilter: ParticipationStatus | "ALL" =
    rsvp === "ATTENDING" || rsvp === "NOT_ATTENDING" || rsvp === "PENDING" ? rsvp : "ALL";
  const rsvpCounts = {
    ALL: day.participants.length,
    ATTENDING: day.participants.filter((p) => p.status === "ATTENDING").length,
    NOT_ATTENDING: day.participants.filter((p) => p.status === "NOT_ATTENDING").length,
    PENDING: day.participants.filter((p) => p.status === "PENDING").length,
  };
  const visibleParticipants =
    isAdmin && rsvpFilter !== "ALL"
      ? participants.filter((p) => statusByUserId.get(p.id) === rsvpFilter)
      : participants;

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
        <h2 className="mb-3 text-lg font-semibold">참가자 ({participants.length})</h2>

        {isAdmin && (
          <div className="mb-4 flex flex-wrap gap-2">
            {(["ALL", "ATTENDING", "NOT_ATTENDING", "PENDING"] as const).map((key) => (
              <Link
                key={key}
                href={key === "ALL" ? `/matches/${day.id}` : `/matches/${day.id}?rsvp=${key}`}
                className={`btn-press touch-target rounded-full px-3 py-1.5 text-xs font-medium ${
                  rsvpFilter === key ? "bg-primary text-white" : "bg-muted text-foreground/70"
                }`}
              >
                {key === "ALL" ? "전체" : RSVP_LABEL[key]} {rsvpCounts[key]}
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
          {visibleParticipants.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {isAdmin && rsvpFilter !== "ALL" ? "해당하는 참가자가 없습니다." : "아직 참가자가 없습니다."}
            </p>
          )}
          {visibleParticipants.map((p) => {
            const status = statusByUserId.get(p.id) ?? "PENDING";
            const canEdit = !!user && (user.id === p.id || isAdmin);
            return (
              <div key={p.id} className="flex flex-col items-center gap-1.5">
                <PlayerBadge avatarSrc={p.avatarSrc} name={p.name} />
                {canEdit ? (
                  <div className="flex gap-1">
                    <form action={setParticipationStatusAction.bind(null, day.id, p.id, "ATTENDING")}>
                      <button
                        className={`btn-press rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          status === "ATTENDING" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        참여
                      </button>
                    </form>
                    <form
                      action={setParticipationStatusAction.bind(null, day.id, p.id, "NOT_ATTENDING")}
                    >
                      <button
                        className={`btn-press rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          status === "NOT_ATTENDING"
                            ? "bg-destructive text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        불참
                      </button>
                    </form>
                  </div>
                ) : (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${RSVP_BADGE[status]}`}>
                    {RSVP_LABEL[status]}
                  </span>
                )}
                {user && (
                  <form action={removeParticipantAction.bind(null, day.id, p.id)}>
                    <button className="btn-press rounded-full px-2 py-1 text-[10px] text-destructive underline">
                      제거
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
        {user && <ParticipantManager dayId={day.id} players={addablePlayers} />}
      </section>

      {user && <MatchComposerPanel dayId={day.id} participants={participants} />}

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
