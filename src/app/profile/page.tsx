import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { RESULT_LABEL } from "@/lib/matchDisplay";

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
    select: { id: true, name: true },
  });
  const nameById = new Map(players.map((p) => [p.id, p.name]));

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-sm text-gray-500">{formatPhone(user.phone)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded border p-4 text-center">
          <p className="text-sm text-gray-500">단식 ELO</p>
          <p className="text-3xl font-bold">{Math.round(singles?.rating ?? 1200)}</p>
        </div>
        <div className="rounded border p-4 text-center">
          <p className="text-sm text-gray-500">복식 ELO</p>
          <p className="text-3xl font-bold">{Math.round(doubles?.rating ?? 1200)}</p>
        </div>
      </div>

      <div className="rounded border p-4">
        <p className="mb-2 text-sm text-gray-500">총 전적</p>
        <div className="flex gap-6 text-center">
          <Stat label="경기" value={totalGames} />
          <Stat label="승" value={totalWins} />
          <Stat label="패" value={totalLosses} />
          <Stat label="무" value={totalDraws} />
        </div>
      </div>

      <div>
        <div className="mb-4 flex gap-1 border-b">
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

        <ul className="space-y-2">
          {matches.length === 0 && (
            <p className="text-sm text-gray-500">경기 기록이 없습니다.</p>
          )}
          {matches.map((m) => {
            const teamA = [m.teamAPlayer1, m.teamAPlayer2]
              .filter((id): id is string => !!id)
              .map((id) => (id === user.id ? "나" : nameById.get(id) ?? "?"))
              .join(" / ");
            const teamB = [m.teamBPlayer1, m.teamBPlayer2]
              .filter((id): id is string => !!id)
              .map((id) => (id === user.id ? "나" : nameById.get(id) ?? "?"))
              .join(" / ");
            return (
              <li key={m.id} className="rounded border px-4 py-3 text-sm">
                <p className="text-gray-500">
                  {m.type === "SINGLES" ? "단식" : "복식"} ·{" "}
                  {m.playedAt.toISOString().slice(0, 10)}
                </p>
                <p className="font-medium">
                  {teamA} vs {teamB} — {m.result ? RESULT_LABEL[m.result] : ""}
                  {m.teamAScore !== null && m.teamBScore !== null
                    ? ` (${m.teamAScore}:${m.teamBScore})`
                    : ""}
                </p>
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
      <p className="text-xs text-gray-500">{label}</p>
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
    <div className="flex items-center justify-between rounded bg-gray-50 px-4 py-2 text-sm">
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
      className={`border-b-2 px-3 py-2 text-sm ${
        isActive ? "border-blue-600 font-medium text-blue-600" : "border-transparent text-gray-500"
      }`}
    >
      {label}
    </Link>
  );
}
