"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { getKakaoOptedInUserIds, sendKakaoMessage } from "@/lib/kakao";
import { getNoticeSettings } from "@/lib/notice";

export interface BroadcastState {
  error?: string;
  success?: boolean;
  recipientCount?: number;
}

// "확성기" — 관리자가 입력한 문구를 카카오 연동+수신 동의된 전체 유저에게
// 즉시 발송한다(현재는 실제 발송 대행사 미연동이라 KakaoMessageLog에 STUBBED로
// 쌓인다 — lib/kakao.ts 참고). 발송 이력은 NoticeBroadcast에 남긴다.
export async function broadcastNoticeAction(
  _prevState: BroadcastState,
  formData: FormData
): Promise<BroadcastState> {
  const admin = await requireAdmin();

  const raw = formData.get("message");
  const message = typeof raw === "string" ? raw.trim() : "";
  if (!message) return { error: "발송할 내용을 입력해주세요." };
  if (message.length > 500) return { error: "500자 이내로 입력해주세요." };

  const recipientIds = await getKakaoOptedInUserIds();
  for (const userId of recipientIds) {
    await sendKakaoMessage({ type: "BROADCAST", userId, message });
  }

  await prisma.noticeBroadcast.create({
    data: { message, sentBy: admin.id, recipientCount: recipientIds.length },
  });

  revalidatePath("/admin");
  return { success: true, recipientCount: recipientIds.length };
}

export async function setMatchCreatedAlarmAction(enabled: boolean) {
  await requireAdmin();
  const settings = await getNoticeSettings();
  await prisma.noticeSettings.update({
    where: { id: settings.id },
    data: { matchCreatedAlarmOn: enabled },
  });
  revalidatePath("/admin");
}

export async function setMvpAlarmAction(enabled: boolean) {
  await requireAdmin();
  const settings = await getNoticeSettings();
  await prisma.noticeSettings.update({ where: { id: settings.id }, data: { mvpAlarmOn: enabled } });
  revalidatePath("/admin");
}

export interface VoteReminderRuleState {
  error?: string;
}

// dayOffset: 0 = 당일(D-Day), 음수 = 그만큼 앞선 날짜(-1 = D-1, -3 = D-3 ...).
export async function addVoteReminderRuleAction(
  _prevState: VoteReminderRuleState,
  formData: FormData
): Promise<VoteReminderRuleState> {
  await requireAdmin();

  const dayOffset = Number(formData.get("dayOffset"));
  const timeStr = formData.get("time");
  const rawLabel = formData.get("label");
  const label = typeof rawLabel === "string" && rawLabel.trim() ? rawLabel.trim().slice(0, 30) : null;

  if (!Number.isInteger(dayOffset) || dayOffset > 0) {
    return { error: "D-DAY 값을 확인해주세요." };
  }
  if (typeof timeStr !== "string" || !/^\d{2}:\d{2}$/.test(timeStr)) {
    return { error: "시간을 확인해주세요." };
  }
  const [hour, minute] = timeStr.split(":").map(Number);

  await prisma.voteReminderRule.create({ data: { label, dayOffset, hour, minute } });
  revalidatePath("/admin");
  return {};
}

export async function deleteVoteReminderRuleAction(id: string) {
  await requireAdmin();
  await prisma.voteReminderRule.delete({ where: { id } });
  revalidatePath("/admin");
}

export async function setVoteReminderRuleEnabledAction(id: string, enabled: boolean) {
  await requireAdmin();
  await prisma.voteReminderRule.update({ where: { id }, data: { enabled } });
  revalidatePath("/admin");
}
