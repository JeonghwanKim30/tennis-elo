"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { matchSubmitSchema } from "@/lib/validation";

export async function addParticipantAction(dayId: string, formData: FormData) {
  await requireUser();

  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) return;

  await prisma.matchDayParticipant.upsert({
    where: { matchDayId_userId: { matchDayId: dayId, userId } },
    create: { matchDayId: dayId, userId },
    update: {},
  });

  revalidatePath(`/matches/${dayId}`);
}

export async function removeParticipantAction(
  dayId: string,
  userId: string,
  _formData: FormData
) {
  await requireUser();

  await prisma.matchDayParticipant
    .delete({ where: { matchDayId_userId: { matchDayId: dayId, userId } } })
    .catch(() => {});

  revalidatePath(`/matches/${dayId}`);
}

export interface CreateMatchState {
  error?: string;
}

export async function createMatchInDayAction(
  dayId: string,
  _prevState: CreateMatchState,
  formData: FormData
): Promise<CreateMatchState> {
  const user = await requireUser();

  const parsed = matchSubmitSchema.safeParse({
    type: formData.get("type"),
    teamAPlayer1: formData.get("teamAPlayer1"),
    teamAPlayer2: formData.get("teamAPlayer2") || undefined,
    teamBPlayer1: formData.get("teamBPlayer1"),
    teamBPlayer2: formData.get("teamBPlayer2") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }
  const data = parsed.data;

  const participants = await prisma.matchDayParticipant.findMany({
    where: { matchDayId: dayId },
    select: { userId: true },
  });
  const participantIds = new Set(participants.map((p) => p.userId));

  const playerIds = [
    data.teamAPlayer1,
    data.teamAPlayer2,
    data.teamBPlayer1,
    data.teamBPlayer2,
  ].filter((id): id is string => !!id);

  if (!playerIds.every((id) => participantIds.has(id))) {
    return { error: "해당 경기일의 참가자만 선택할 수 있습니다." };
  }

  await prisma.match.create({
    data: {
      matchDayId: dayId,
      type: data.type,
      teamAPlayer1: data.teamAPlayer1,
      teamAPlayer2: data.type === "DOUBLES" ? data.teamAPlayer2 : null,
      teamBPlayer1: data.teamBPlayer1,
      teamBPlayer2: data.type === "DOUBLES" ? data.teamBPlayer2 : null,
      submittedBy: user.id,
    },
  });

  revalidatePath(`/matches/${dayId}`);
  revalidatePath("/matches");
  return {};
}
