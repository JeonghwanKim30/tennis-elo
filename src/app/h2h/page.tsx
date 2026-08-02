import { prisma } from "@/lib/prisma";
import type { Match } from "@/generated/prisma/client";

const RESULT_LABEL: Record<string, string> = {
  TEAM_A_WIN: "A팀 승",
  TEAM_B_WIN: "B팀 승",
  DRAW: "무승부",
};

function teamOf(m: Match, userId: string): "A" | "B" | null {
  if (m.teamAPlayer1 === userId || m.teamAPlayer2 === userId) return "A";
  if (m.teamBPlayer1 === userId || m.teamBPlayer2 === userId) return "B";
  return null;
}

export default async function H2HPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;

  const players = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const nameById = new Map(players.map((p) => [p.id, p.name]));

  let summary: { aWins: number; bWins: number; draws: number } | null = null;
  let matches: Match[] = [];

  if (a && b && a !== b) {
    const candidates = await prisma.match.findMany({
      where: {
        status: "APPROVED",
        OR: [{ teamAPlayer1: a }, { teamAPlayer2: a }, { teamBPlayer1: a }, { teamBPlayer2: a }],
      },
      orderBy: { approvalSeq: "desc" },
    });

    matches = candidates.filter((m) => {
      const sideA = teamOf(m, a);
      const sideB = teamOf(m, b);
      return sideA !== null && sideB !== null && sideA !== sideB;
    });

    let aWins = 0;
    let bWins = 0;
    let draws = 0;
    for (const m of matches) {
      const sideA = teamOf(m, a);
      if (m.result === "DRAW") {
        draws += 1;
      } else if (
        (m.result === "TEAM_A_WIN" && sideA === "A") ||
        (m.result === "TEAM_B_WIN" && sideA === "B")
      ) {
        aWins += 1;
      } else {
        bWins += 1;
      }
    }
    summary = { aWins, bWins, draws };
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <h1 className="text-2xl font-bold">상대전적</h1>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <PlayerSelect name="a" label="선수 A" players={players} selected={a} />
        <PlayerSelect name="b" label="선수 B" players={players} selected={b} />
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
          조회
        </button>
      </form>

      {a && b && a === b && (
        <p className="text-sm text-red-600">서로 다른 두 선수를 선택해주세요.</p>
      )}

      {summary && (
        <div>
          <div className="rounded border p-4 text-center text-lg font-medium">
            {nameById.get(a!) ?? "?"} {summary.aWins}승 {summary.draws}무 {summary.bWins}패{" "}
            {nameById.get(b!) ?? "?"}
          </div>

          <ul className="mt-4 space-y-2">
            {matches.length === 0 && (
              <p className="text-sm text-gray-500">맞대결 기록이 없습니다.</p>
            )}
            {matches.map((m) => (
              <li key={m.id} className="rounded border px-4 py-3 text-sm">
                <p className="text-gray-500">
                  {m.type === "SINGLES" ? "단식" : "복식"} ·{" "}
                  {m.playedAt.toISOString().slice(0, 10)}
                </p>
                <p className="font-medium">{RESULT_LABEL[m.result]}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

function PlayerSelect({
  name,
  label,
  players,
  selected,
}: {
  name: string;
  label: string;
  players: { id: string; name: string }[];
  selected?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs text-gray-500">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={selected ?? ""}
        className="mt-1 rounded border px-3 py-2 text-sm"
      >
        <option value="">선택하세요</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
