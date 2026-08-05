"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { matchSubmitSchema } from "@/lib/validation";

// 본인 또는 관리자만 참여/불참을 투표할 수 있다. 해당 일자에 아직 기록이 없으면
// (한 번도 응답하지 않은 회원 = 미응답) 새로 만들고, 있으면 상태만 갱신한다.
export async function setParticipationStatusAction(
  dayId: string,
  userId: string,
  status: "ATTENDING" | "NOT_ATTENDING",
  _formData: FormData
) {
  const user = await requireUser();
  if (user.id !== userId && user.role !== "ADMIN") return;

  await prisma.matchDayParticipant.upsert({
    where: { matchDayId_userId: { matchDayId: dayId, userId } },
    create: { matchDayId: dayId, userId, status },
    update: { status },
  });

  revalidatePath(`/matches/${dayId}`);
  revalidatePath("/matches");
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

  // 팀 구성은 그날 "참여"를 선택한 사람 중에서만 가능하다.
  const attending = await prisma.matchDayParticipant.findMany({
    where: { matchDayId: dayId, status: "ATTENDING" },
    select: { userId: true },
  });
  const attendingIds = new Set(attending.map((p) => p.userId));

  const playerIds = [
    data.teamAPlayer1,
    data.teamAPlayer2,
    data.teamBPlayer1,
    data.teamBPlayer2,
  ].filter((id): id is string => !!id);

  if (!playerIds.every((id) => attendingIds.has(id))) {
    return { error: "참여를 선택한 회원만 경기에 배치할 수 있습니다." };
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
