import { prisma } from "@/lib/prisma";

// layout.tsx의 metadataBase와 동일한 규칙 — Vercel 배포 시 자동 주입되는
// VERCEL_URL을 쓰고, 로컬 개발 환경에서는 localhost로 대체한다.
export function appBaseUrl(): string {
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
}

export function matchDayLink(matchDayId: string): string {
  return `${appBaseUrl()}/matches/${matchDayId}`;
}

export function mvpDeepLink(matchDayId: string): string {
  return `${appBaseUrl()}/matches/${matchDayId}?openMvp=1`;
}

function formatDateLabel(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildMatchCreatedMessage(matchDayId: string, date: Date, time: string | null, location: string | null): string {
  const detail = [formatDateLabel(date), time, location].filter(Boolean).join(" · ");
  return `새로운 경기가 등록되었습니다. 일정을 확인하시고 참석 여부를 투표해주세요!\n${detail}\n${matchDayLink(matchDayId)}`;
}

export function buildMvpMessage(matchDayId: string, date: Date): string {
  return `${formatDateLabel(date)} 경기의 MVP가 선정되었습니다. 아래 링크를 통해 확인해주세요!\n${mvpDeepLink(matchDayId)}`;
}

export function buildVoteReminderMessage(matchDayId: string, date: Date): string {
  return `아직 참석 여부를 답하지 않은 경기가 있어요. 아래 일정을 확인해주세요!\n${formatDateLabel(date)}\n${matchDayLink(matchDayId)}`;
}

// 관리자 "공지설정" 탭 자동 알림 ON/OFF 스위치 — 싱글턴 행(id="singleton").
// 없으면 기본값(둘 다 ON)으로 새로 만들어 돌려준다.
export async function getNoticeSettings() {
  return prisma.noticeSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}
