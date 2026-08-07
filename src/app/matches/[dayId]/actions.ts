"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { matchSubmitSchema } from "@/lib/validation";
import { MAX_PHOTOS_PER_DAY } from "./photoConfig";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export interface MatchDayPhotoState {
  error?: string;
  id?: string;
}

// 경기일당 사진은 최대 MAX_PHOTOS_PER_DAY장까지 갤러리 형태로 쌓인다(용량 부하
// 방지를 위한 상한). 로그인한 회원이면 누구나 올릴 수 있다(경기 등록/참여 투표와
// 동일한 권한 수준) — 삭제도 마찬가지로 로그인한 누구나 가능하다.
export async function uploadMatchDayPhotoAction(
  dayId: string,
  dataUrl: string
): Promise<MatchDayPhotoState> {
  const user = await requireUser();

  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return { error: "이미지 형식이 올바르지 않습니다." };
  }
  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  if (buffer.byteLength > MAX_PHOTO_BYTES) {
    return { error: "이미지 용량이 너무 큽니다." };
  }

  const count = await prisma.matchDayPhoto.count({ where: { matchDayId: dayId } });
  if (count >= MAX_PHOTOS_PER_DAY) {
    return { error: `사진은 최대 ${MAX_PHOTOS_PER_DAY}장까지 등록할 수 있습니다.` };
  }

  const photo = await prisma.matchDayPhoto.create({
    data: { matchDayId: dayId, image: buffer, imageType: mimeType, uploadedBy: user.id },
  });

  revalidatePath(`/matches/${dayId}`);
  revalidatePath("/matches");
  return { id: photo.id };
}

export async function deleteMatchDayPhotoAction(photoId: string) {
  await requireUser();
  const photo = await prisma.matchDayPhoto.delete({ where: { id: photoId } });
  revalidatePath(`/matches/${photo.matchDayId}`);
  revalidatePath("/matches");
}

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
