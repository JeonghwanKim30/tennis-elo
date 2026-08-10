"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// 연동 해제 — 카카오 식별자를 전부 지운다(전화번호처럼 마스킹할 필요 없음,
// unique 제약도 kakaoId 하나뿐이라 곧바로 null로 되돌려도 안전하다).
// 수신 동의도 함께 꺼서, 연동 안 된 계정에 동의만 남아있는 상태를 방지한다.
export async function disconnectKakaoAction() {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { kakaoId: null, kakaoNickname: null, kakaoConnectedAt: null, kakaoNotifyOptIn: false },
  });
  revalidatePath("/profile");
}

export async function setKakaoNotifyOptInAction(enabled: boolean) {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { kakaoNotifyOptIn: enabled } });
  revalidatePath("/profile");
}
