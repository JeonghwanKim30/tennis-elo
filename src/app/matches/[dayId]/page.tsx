import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { avatarSrc } from "@/lib/avatar";
import { RESULT_LABEL } from "@/lib/matchDisplay";
import { PlayerBadge } from "@/components/PlayerBadge";
import { TeamBadges, type TeamPlayer } from "@/components/TeamBadges";
import { ParticipantManager } from "./ParticipantManager";
import { MatchComposerPanel } from "./MatchComposerPanel";
import { removeParticipantAction } from "./actions";

export default async function MatchDayPage({
  params,
}: {
  params: Promise<{ dayId: string }>;
}) {
  const { dayId } = await params;
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

  const activeUsers = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const addablePlayers = activeUsers.filter((u) => !participantIds.has(u.id));

  const scheduled = day.matches.filter((m) => m.status === "PENDING");
  const completed = day.matches.filter((m) => m.status === "APPROVED");

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <h1 className="text-2xl font-bold">{day.date.toISOString().slice(0, 10)} 경기</h1>

      <section>
        <h2 className="mb-3 text-lg font-semibold">참가자 ({participants.length})</h2>
        <div className="flex flex-wrap gap-4">
          {participants.length === 0 && (
            <p className="text-sm text-gray-500">아직 참가자가 없습니다.</p>
          )}
          {participants.map((p) => (
            <div key={p.id} className="flex flex-col items-center">
              <PlayerBadge avatarSrc={p.avatarSrc} name={p.name} />
              {user && (
                <form action={removeParticipantAction.bind(null, day.id, p.id)}>
                  <button className="mt-1 text-[10px] text-destructive underline">제거</button>
                </form>
              )}
            </div>
          ))}
        </div>
        {user && <ParticipantManager dayId={day.id} players={addablePlayers} />}
      </section>

      {user && <MatchComposerPanel dayId={day.id} participants={participants} />}

      <section>
        <h2 className="mb-3 text-lg font-semibold">예정된 경기 ({scheduled.length})</h2>
        {scheduled.length === 0 ? (
          <p className="text-sm text-gray-500">점수 입력을 기다리는 경기가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {scheduled.map((m) => {
              const a1 = playerById.get(m.teamAPlayer1);
              const a2 = m.teamAPlayer2 ? playerById.get(m.teamAPlayer2) : null;
              const b1 = playerById.get(m.teamBPlayer1);
              const b2 = m.teamBPlayer2 ? playerById.get(m.teamBPlayer2) : null;
              if (!a1 || !b1) return null;
              return (
                <li key={m.id} className="rounded border px-4 py-3">
                  <p className="mb-2 text-sm text-gray-500">
                    {m.type === "SINGLES" ? "단식" : "복식"} · 점수 입력 대기 중
                  </p>
                  <div className="flex items-center gap-3">
                    <TeamBadges type={m.type} player1={a1} player2={a2} />
                    <span className="text-xs text-gray-400">vs</span>
                    <TeamBadges type={m.type} player1={b1} player2={b2} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">완료된 경기</h2>
        {completed.length === 0 ? (
          <p className="text-sm text-gray-500">완료된 경기가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {completed.map((m) => {
              const a1 = playerById.get(m.teamAPlayer1);
              const a2 = m.teamAPlayer2 ? playerById.get(m.teamAPlayer2) : null;
              const b1 = playerById.get(m.teamBPlayer1);
              const b2 = m.teamBPlayer2 ? playerById.get(m.teamBPlayer2) : null;
              if (!a1 || !b1) return null;
              return (
                <li key={m.id} className="rounded border px-4 py-3">
                  <p className="mb-2 text-sm text-gray-500">
                    {m.type === "SINGLES" ? "단식" : "복식"}
                  </p>
                  <div className="flex items-center gap-3">
                    <TeamBadges type={m.type} player1={a1} player2={a2} />
                    <span className="text-xs text-gray-400">vs</span>
                    <TeamBadges type={m.type} player1={b1} player2={b2} />
                    <span className="ml-auto font-medium">
                      {m.result ? RESULT_LABEL[m.result] : ""}
                      {m.teamAScore !== null && m.teamBScore !== null
                        ? ` (${m.teamAScore}:${m.teamBScore})`
                        : ""}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
