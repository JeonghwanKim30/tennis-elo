import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { RESULT_LABEL } from "@/lib/matchDisplay";
import { avatarSrc } from "@/lib/avatar";
import { type TeamPlayer } from "@/components/TeamBadges";
import { MatchupRow } from "@/components/MatchupRow";
import { AvatarUploader } from "./AvatarUploader";

type Tab = "all" | "singles" | "doubles";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "singles" || rawTab === "doubles" ? rawTab : "all";

  const ratings = await prisma.eloRating.findMany({ where: { userId: user.id } });
  const singles = ratings.find((r) => r.type === "SINGLES");
  const doubles = ratings.find((r) => r.type === "DOUBLES");

  const totalWins = (singles?.wins ?? 0) + (doubles?.wins ?? 0);
  const totalLosses = (singles?.losses ?? 0) + (doubles?.losses ?? 0);
  const totalDraws = (singles?.draws ?? 0) + (doubles?.draws ?? 0);
  const totalGames = totalWins + totalLosses + totalDraws;

  const typeFilter = tab === "singles" ? "SINGLES" : tab === "doubles" ? "DOUBLES" : undefined;

  const matches = await prisma.match.findMany({
    where: {
      status: "APPROVED",
      ...(typeFilter ? { type: typeFilter } : {}),
      OR: [
        { teamAPlayer1: user.id },
        { teamAPlayer2: user.id },
        { teamBPlayer1: user.id },
        { teamBPlayer2: user.id },
      ],
    },
    include: { matchDay: true },
    orderBy: { approvalSeq: "desc" },
  });

  const playerIds = Array.from(
    new Set(
      matches.flatMap((m) =>
        [m.teamAPlayer1, m.teamAPlayer2, m.teamBPlayer1, m.teamBPlayer2].filter(
          (id): id is string => !!id
        )
      )
    )
  );
  const players = await prisma.user.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, name: true, gender: true, profileImage: true, profileImageType: true },
  });
  const playerById = new Map<string, TeamPlayer>(
    players.map((p) => [p.id, { id: p.id, name: p.name, avatarSrc: avatarSrc(p) }])
  );

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <div className="flex items-center gap-4">
        <AvatarUploader currentSrc={avatarSrc(user)} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{user.name}</h1>
          <p className="truncate text-sm text-muted-foreground">{formatPhone(user.phone)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="surface-card p-4 text-center">
          <p className="text-sm text-muted-foreground">단식 ELO</p>
          <p className="font-display text-4xl font-bold text-primary">
            {Math.round(singles?.rating ?? 1200)}
          </p>
        </div>
        <div className="surface-card p-4 text-center">
          <p className="text-sm text-muted-foreground">복식 ELO</p>
          <p className="font-display text-4xl font-bold text-primary">
            {Math.round(doubles?.rating ?? 1200)}
          </p>
        </div>
      </div>

      <div className="surface-card p-4">
        <p className="mb-2 text-sm text-muted-foreground">총 전적</p>
        <div className="flex gap-6 text-center">
          <Stat label="경기" value={totalGames} />
          <Stat label="승" value={totalWins} />
          <Stat label="패" value={totalLosses} />
          <Stat label="무" value={totalDraws} />
        </div>
      </div>

      <div>
        <div className="mb-4 flex gap-2">
          <TabLink tab="all" current={tab} label="전체" />
          <TabLink tab="singles" current={tab} label="단식" />
          <TabLink tab="doubles" current={tab} label="복식" />
        </div>

        <div className="mb-4 space-y-3">
          {(tab === "all" || tab === "singles") && (
            <BreakdownRow
              label="단식"
              wins={singles?.wins ?? 0}
              losses={singles?.losses ?? 0}
              draws={singles?.draws ?? 0}
            />
          )}
          {(tab === "all" || tab === "doubles") && (
            <BreakdownRow
              label="복식"
              wins={doubles?.wins ?? 0}
              losses={doubles?.losses ?? 0}
              draws={doubles?.draws ?? 0}
            />
          )}
        </div>

        <ul className="space-y-3">
          {matches.length === 0 && (
            <p className="text-sm text-muted-foreground">경기 기록이 없습니다.</p>
          )}
          {matches.map((m) => {
            const teamAP1 = playerById.get(m.teamAPlayer1);
            const teamAP2 = m.teamAPlayer2 ? playerById.get(m.teamAPlayer2) : null;
            const teamBP1 = playerById.get(m.teamBPlayer1);
            const teamBP2 = m.teamBPlayer2 ? playerById.get(m.teamBPlayer2) : null;
            if (!teamAP1 || !teamBP1) return null;
            return (
              <li key={m.id} className="surface-card px-5 py-4 text-sm">
                <p className="mb-2 text-muted-foreground">
                  {m.type === "SINGLES" ? "단식" : "복식"} ·{" "}
                  {m.matchDay.date.toISOString().slice(0, 10)}
                </p>
                <MatchupRow
                  type={m.type}
                  teamA1={teamAP1}
                  teamA2={teamAP2}
                  teamB1={teamBP1}
                  teamB2={teamBP2}
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
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function BreakdownRow({
  label,
  wins,
  losses,
  draws,
}: {
  label: string;
  wins: number;
  losses: number;
  draws: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-2.5 text-sm">
      <span className="font-medium">{label}</span>
      <span>
        {wins}승 {losses}패 {draws}무 (총 {wins + losses + draws}경기)
      </span>
    </div>
  );
}

function TabLink({ tab, current, label }: { tab: Tab; current: Tab; label: string }) {
  const isActive = tab === current;
  const href = tab === "all" ? "/profile" : `/profile?tab=${tab}`;
  return (
    <Link
      href={href}
      className={`tab-pill btn-press touch-target rounded-full px-4 py-2 text-sm font-medium ${
        isActive ? "bg-primary text-white shadow-sm shadow-primary/30" : "bg-muted text-foreground/70"
      }`}
    >
      {label}
    </Link>
  );
}
