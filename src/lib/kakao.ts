import { prisma } from "@/lib/prisma";
import type { KakaoMessageType } from "@/generated/prisma/client";

// ── 카카오 알림톡/비즈메시지 발송 ────────────────────────────────────────
// 실제로 카카오톡 메시지를 밀어넣으려면 카카오 비즈니스 채널 + 승인된 알림톡
// 템플릿 + 발송 대행사(Solapi·NHN Toast·알리고 등) 계정이 필요하다. 아직 그런
// 자격 증명이 없어서, 지금은 "무엇을 누구에게 언제 보내려 했는지"만 DB에
// 기록하는 스텁으로 동작한다. 나중에 대행사 계정이 생기면:
//   1) KAKAO_ALIMTALK_PROVIDER_API_KEY 등 필요한 env var를 채우고
//   2) 아래 sendKakaoMessage() 안의 TODO 부분만 실제 API 호출로 바꾸면 된다.
// 트리거 지점(경기 등록/MVP 선정/D-DAY 독촉/관리자 확성기)은 이미 전부
// sendKakaoMessage()를 통해서만 발송하도록 연결되어 있어 별도 수정이 필요 없다.
const PROVIDER_API_KEY = process.env.KAKAO_ALIMTALK_PROVIDER_API_KEY;

export function isKakaoSendingConfigured(): boolean {
  return !!PROVIDER_API_KEY;
}

export function isKakaoLoginConfigured(): boolean {
  return !!process.env.KAKAO_REST_API_KEY;
}

export interface SendKakaoMessageInput {
  type: KakaoMessageType;
  userId?: string | null;
  message: string;
  /** MVP/D-DAY 독촉처럼 특정 경기일에 묶인 알림의 중복 발송 방지용 참조값. */
  matchDayId?: string | null;
  /** D-DAY 독촉 알림 규칙(VoteReminderRule) 참조값. */
  ruleId?: string | null;
}

export async function sendKakaoMessage(input: SendKakaoMessageInput): Promise<void> {
  if (isKakaoSendingConfigured()) {
    // TODO: 대행사 API 연동 — 성공/실패에 따라 status를 SENT/FAILED로 기록.
    // 지금은 대행사 계정이 없어 이 분기에 도달하지 않는다.
  }

  await prisma.kakaoMessageLog.create({
    data: {
      type: input.type,
      userId: input.userId ?? null,
      matchDayId: input.matchDayId ?? null,
      ruleId: input.ruleId ?? null,
      message: input.message,
      status: "STUBBED",
    },
  });
}

/** 카카오 연동 + 수신 동의가 모두 켜진 활성 유저 id 목록. userIds를 주면 그 안에서만 필터링. */
export async function getKakaoOptedInUserIds(userIds?: string[]): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      kakaoId: { not: null },
      kakaoNotifyOptIn: true,
      ...(userIds ? { id: { in: userIds } } : {}),
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** 이 경기일에 이미 해당 타입의 알림을 보낸 적이 있는지(중복 발송 방지). */
export async function hasKakaoMessageBeenSent(
  matchDayId: string,
  type: KakaoMessageType,
  ruleId?: string | null
): Promise<boolean> {
  const count = await prisma.kakaoMessageLog.count({
    where: { matchDayId, type, ...(ruleId !== undefined ? { ruleId } : {}) },
  });
  return count > 0;
}
