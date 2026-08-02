"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import {
  calculateDoublesElo,
  calculateSinglesElo,
  INITIAL_RATING,
  type MatchOutcome,
} from "@/lib/elo";

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

export async function rejectMatchAction(matchId: string) {
  const admin = await requireAdmin();
  await prisma.match.update({
    where: { id: matchId },
    data: { status: "REJECTED", approvedAt: new Date(), approvedBy: admin.id },
  });
  revalidatePath("/admin");
}

export async function approveMatchAction(matchId: string) {
  const admin = await requireAdmin();

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUniqueOrThrow({ where: { id: matchId } });
    if (match.status !== "PENDING") return;

    const teamAIds = [match.teamAPlayer1, match.teamAPlayer2].filter(
      (id): id is string => !!id
    );
    const teamBIds = [match.teamBPlayer1, match.teamBPlayer2].filter(
      (id): id is string => !!id
    );
    const allIds = [...teamAIds, ...teamBIds];

    await tx.eloRating.createMany({
      data: allIds.map((userId) => ({ userId, type: match.type, rating: INITIAL_RATING })),
      skipDuplicates: true,
    });

    const ratingRows = await tx.eloRating.findMany({
      where: { userId: { in: allIds }, type: match.type },
    });
    const ratingByUser = new Map(ratingRows.map((r) => [r.userId, r]));

    const outcomeForTeamA: MatchOutcome =
      match.result === "TEAM_A_WIN" ? "WIN" : match.result === "TEAM_B_WIN" ? "LOSS" : "DRAW";
    const outcomeForTeamB: MatchOutcome =
      match.result === "TEAM_A_WIN" ? "LOSS" : match.result === "TEAM_B_WIN" ? "WIN" : "DRAW";

    let newRatings: Map<string, number>;

    if (match.type === "SINGLES") {
      const a = ratingByUser.get(teamAIds[0])!;
      const b = ratingByUser.get(teamBIds[0])!;
      const result = calculateSinglesElo(a.rating, b.rating, outcomeForTeamA);
      newRatings = new Map([
        [teamAIds[0], result.ratingA],
        [teamBIds[0], result.ratingB],
      ]);
    } else {
      const a1 = ratingByUser.get(teamAIds[0])!;
      const a2 = ratingByUser.get(teamAIds[1])!;
      const b1 = ratingByUser.get(teamBIds[0])!;
      const b2 = ratingByUser.get(teamBIds[1])!;
      const result = calculateDoublesElo(
        [a1.rating, a2.rating],
        [b1.rating, b2.rating],
        outcomeForTeamA
      );
      newRatings = new Map([
        [teamAIds[0], result.teamA[0]],
        [teamAIds[1], result.teamA[1]],
        [teamBIds[0], result.teamB[0]],
        [teamBIds[1], result.teamB[1]],
      ]);
    }

    const maxSeq = await tx.match.aggregate({ _max: { approvalSeq: true } });
    const nextSeq = (maxSeq._max.approvalSeq ?? 0) + 1;

    for (const userId of allIds) {
      const before = ratingByUser.get(userId)!;
      const after = newRatings.get(userId)!;
      const outcome = teamAIds.includes(userId) ? outcomeForTeamA : outcomeForTeamB;

      await tx.eloRating.update({
        where: { userId_type: { userId, type: match.type } },
        data: {
          rating: after,
          wins: { increment: outcome === "WIN" ? 1 : 0 },
          losses: { increment: outcome === "LOSS" ? 1 : 0 },
          draws: { increment: outcome === "DRAW" ? 1 : 0 },
        },
      });

      await tx.eloHistory.create({
        data: {
          matchId: match.id,
          userId,
          type: match.type,
          ratingBefore: before.rating,
          ratingAfter: after,
          delta: after - before.rating,
        },
      });
    }

    await tx.match.update({
      where: { id: match.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: admin.id,
        approvalSeq: nextSeq,
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/profile");
}
