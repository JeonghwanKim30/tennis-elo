"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { matchSubmitSchema } from "@/lib/validation";

export interface MatchSubmitState {
  error?: string;
  success?: boolean;
}

export async function submitMatchAction(
  _prevState: MatchSubmitState,
  formData: FormData
): Promise<MatchSubmitState> {
  const user = await requireUser();

  const parsed = matchSubmitSchema.safeParse({
    type: formData.get("type"),
    playedAt: formData.get("playedAt"),
    teamAPlayer1: formData.get("teamAPlayer1"),
    teamAPlayer2: formData.get("teamAPlayer2") || undefined,
    teamBPlayer1: formData.get("teamBPlayer1"),
    teamBPlayer2: formData.get("teamBPlayer2") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const data = parsed.data;
  const playedAt = new Date(data.playedAt);
  if (Number.isNaN(playedAt.getTime())) {
    return { error: "경기 날짜가 올바르지 않습니다." };
  }

  const playerIds = [
    data.teamAPlayer1,
    data.teamAPlayer2,
    data.teamBPlayer1,
    data.teamBPlayer2,
  ].filter((id): id is string => !!id);

  const activePlayers = await prisma.user.count({
    where: { id: { in: playerIds }, status: "ACTIVE" },
  });
  if (activePlayers !== playerIds.length) {
    return { error: "선택한 선수 중 활성 상태가 아닌 사용자가 있습니다." };
  }

  await prisma.match.create({
    data: {
      type: data.type,
      playedAt,
      teamAPlayer1: data.teamAPlayer1,
      teamAPlayer2: data.type === "DOUBLES" ? data.teamAPlayer2 : null,
      teamBPlayer1: data.teamBPlayer1,
      teamBPlayer2: data.type === "DOUBLES" ? data.teamBPlayer2 : null,
      submittedBy: user.id,
    },
  });

  revalidatePath("/matches/new");
  revalidatePath("/matches");
  return { success: true };
}
