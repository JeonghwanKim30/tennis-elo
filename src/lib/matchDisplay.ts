import type { MatchType } from "@/generated/prisma/client";

export const RESULT_LABEL: Record<string, string> = {
  TEAM_A_WIN: "A팀 승",
  TEAM_B_WIN: "B팀 승",
  DRAW: "무승부",
};

export function teamLabel(
  type: MatchType,
  player1Name: string,
  player2Name?: string | null
): string {
  if (type === "SINGLES" || !player2Name) return player1Name;
  return `${player1Name}(포핸드)/${player2Name}(백핸드)`;
}
