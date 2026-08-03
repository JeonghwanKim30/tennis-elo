"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { INITIAL_RATING } from "@/lib/elo";
import { applyEloForMatch, recalculateAllElo } from "@/lib/eloEngine";
import { matchScoreSchema } from "@/lib/validation";
import type { MatchResult } from "@/generated/prisma/client";

export interface MatchScoreState {
  error?: string;
}

export async function approveUserAction(userId: string) {
  const admin = await requireAdmin();

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.status !== "PENDING") return;

    await tx.user.update({
      where: { id: userId },
      data: { status: "ACTIVE", approvedAt: new Date(), approvedBy: admin.id },
    });

    await tx.eloRating.createMany({
      data: [
        { userId, type: "SINGLES", rating: INITIAL_RATING },
        { userId, type: "DOUBLES", rating: INITIAL_RATING },
      ],
      skipDuplicates: true,
    });
  });

  revalidatePath("/admin");
}

export async function rejectUserAction(userId: string) {
  const admin = await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { status: "REJECTED", approvedAt: new Date(), approvedBy: admin.id },
  });
  revalidatePath("/admin");
}

export async function enterMatchScoreAction(
  matchId: string,
  _prevState: MatchScoreState,
  formData: FormData
): Promise<MatchScoreState> {
  const admin = await requireAdmin();

  const parsed = matchScoreSchema.safeParse({
    teamAScore: formData.get("teamAScore"),
    teamBScore: formData.get("teamBScore"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "점수를 확인해주세요." };
  }
  const { teamAScore, teamBScore } = parsed.data;
  const result: MatchResult =
    teamAScore > teamBScore ? "TEAM_A_WIN" : teamAScore < teamBScore ? "TEAM_B_WIN" : "DRAW";

  const matchDayId = await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUniqueOrThrow({ where: { id: matchId } });
    if (match.status !== "PENDING") return match.matchDayId;

    await applyEloForMatch(tx, match, result);

    const maxSeq = await tx.match.aggregate({ _max: { approvalSeq: true } });
    const nextSeq = (maxSeq._max.approvalSeq ?? 0) + 1;

    await tx.match.update({
      where: { id: match.id },
      data: {
        status: "APPROVED",
        result,
        teamAScore,
        teamBScore,
        approvedAt: new Date(),
        approvedBy: admin.id,
        approvalSeq: nextSeq,
      },
    });

    return match.matchDayId;
  });

  revalidatePath("/admin");
  revalidatePath("/matches");
  revalidatePath(`/matches/${matchDayId}`);
  revalidatePath("/leaderboard");
  revalidatePath("/profile");

  return {};
}

/**
 * 경기를 완전히 삭제한다 (예정된 경기 취소, 완료된 경기 삭제 공용).
 * 이미 ELO에 반영된(APPROVED) 경기였다면 전체 경기를 approvalSeq 순서대로
 * 다시 재생해 ELO/전적을 재계산한다 (ELO는 순서 의존적인 계산이라 부분 롤백이 불가능하다).
 */
export async function deleteMatchAction(matchId: string) {
  await requireAdmin();

  const matchDayId = await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUniqueOrThrow({ where: { id: matchId } });
    const wasApproved = match.status === "APPROVED";

    await tx.match.delete({ where: { id: matchId } });

    if (wasApproved) {
      await recalculateAllElo(tx);
    }

    return match.matchDayId;
  });

  revalidatePath("/admin");
  revalidatePath("/matches");
  revalidatePath(`/matches/${matchDayId}`);
  revalidatePath("/leaderboard");
  revalidatePath("/profile");
}
