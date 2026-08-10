import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeDailyMvp } from "@/lib/mvp";
import { getKakaoOptedInUserIds, hasKakaoMessageBeenSent, sendKakaoMessage } from "@/lib/kakao";
import { buildMvpMessage, buildVoteReminderMessage, getNoticeSettings } from "@/lib/notice";

// 관리자 공지설정 탭에서 만든 두 종류의 시간 기반 알림(MVP 12시간 후 발송,
// D-DAY 미응답 독촉)을 실제로 발송 "시도"하는 크론 엔드포인트. 배포
// 플랫폼(예: Vercel Cron)이 이 경로를 주기적으로 호출하도록 vercel.json에
// 등록해뒀다. 서버 실행 환경의 타임존이 UTC일 수 있으므로, 한국 시각(KST,
// UTC+9) 기준으로 직접 계산한다 — new Date().setHours() 같은 로컬 타임존
// 의존 API는 쓰지 않는다.
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MVP_DELAY_MS = 12 * HOUR_MS;
const KST_OFFSET_MS = 9 * HOUR_MS;
// 경기일에 시간(time)이 입력되지 않은 경우, "저녁 즈음 끝났을 것"으로 보고
// KST 21:00을 경기 종료 시각으로 가정한다.
const DEFAULT_END_HOUR_KST = 21;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 로컬 개발 편의 — 운영에서는 반드시 CRON_SECRET을 설정할 것.
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** 지금 이 순간의 "한국 시각 기준" 시/분 (서버 타임존과 무관). */
function nowKstHourMinute(now: Date): { hour: number; minute: number } {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  return { hour: kst.getUTCHours(), minute: kst.getUTCMinutes() };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { mvpNotified: 0, voteReminderNotified: 0 };

  // ── 1) MVP 알림: 경기 종료(경기일 date + time, KST) 후 12시간 경과 ──────
  const settings = await getNoticeSettings();
  if (settings.mvpAlarmOn) {
    const pastDays = await prisma.matchDay.findMany({
      where: { date: { lte: now } },
      include: { matches: { where: { status: "APPROVED" } } },
      orderBy: { date: "desc" },
      take: 60,
    });

    for (const day of pastDays) {
      const [h, m] = day.time
        ? day.time.split(":").map(Number)
        : [DEFAULT_END_HOUR_KST, 0];
      // day.date는 그 날짜의 UTC 00:00 — 여기에 (KST 시각 - 9시간)을 더하면
      // 서버 타임존과 무관하게 정확한 UTC 인스턴트가 나온다.
      const endsAtMs = day.date.getTime() + (h - 9) * HOUR_MS + m * 60_000;
      if (now.getTime() - endsAtMs < MVP_DELAY_MS) continue;

      if (await hasKakaoMessageBeenSent(day.id, "MVP_SELECTED")) continue;

      const mvp = computeDailyMvp(
        day.matches.map((match) => ({
          teamAPlayer1: match.teamAPlayer1,
          teamAPlayer2: match.teamAPlayer2,
          teamBPlayer1: match.teamBPlayer1,
          teamBPlayer2: match.teamBPlayer2,
          teamAEloChange: match.teamAEloChange,
          teamBEloChange: match.teamBEloChange,
          result: match.result,
        }))
      );

      if (mvp) {
        const message = buildMvpMessage(day.id, day.date);
        const recipientIds = await getKakaoOptedInUserIds();
        for (const userId of recipientIds) {
          await sendKakaoMessage({ type: "MVP_SELECTED", userId, message, matchDayId: day.id });
        }
        results.mvpNotified += recipientIds.length;
      } else {
        // MVP 없음(순 ELO 상승자 없음)도 "처리 완료" 마커를 남겨 매 실행마다 재계산하지 않는다.
        await sendKakaoMessage({
          type: "MVP_SELECTED",
          message: `${day.date.toISOString().slice(0, 10)} MVP 없음(순 ELO 상승자 없음)`,
          matchDayId: day.id,
        });
      }
    }
  }

  // ── 2) D-DAY 미응답 투표 독촉 알림 ──────────────────────────────────
  const { hour: kstHour, minute: kstMinute } = nowKstHourMinute(now);
  const rules = await prisma.voteReminderRule.findMany({ where: { enabled: true } });

  for (const rule of rules) {
    const ruleTimeReached =
      kstHour > rule.hour || (kstHour === rule.hour && kstMinute >= rule.minute);
    if (!ruleTimeReached) continue;

    // dayOffset은 0 이하(0 = 당일, -3 = D-3) — "오늘 날짜 - dayOffset"이 이
    // 규칙이 겨냥하는 경기일이다(오늘 기준 D-3 규칙은 3일 뒤 경기를 겨냥).
    const todayUtcMidnight = new Date(now.toISOString().slice(0, 10));
    const targetDate = new Date(todayUtcMidnight.getTime() - rule.dayOffset * DAY_MS);

    const matchDay = await prisma.matchDay.findUnique({ where: { date: targetDate } });
    if (!matchDay) continue;
    if (await hasKakaoMessageBeenSent(matchDay.id, "VOTE_REMINDER", rule.id)) continue;

    const participants = await prisma.matchDayParticipant.findMany({
      where: { matchDayId: matchDay.id },
    });
    const respondedIds = new Set(
      participants.filter((p) => p.status !== "PENDING").map((p) => p.userId)
    );
    const activeUsers = await prisma.user.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
    const pendingUserIds = activeUsers.map((u) => u.id).filter((id) => !respondedIds.has(id));

    const recipientIds = await getKakaoOptedInUserIds(pendingUserIds);
    const message = buildVoteReminderMessage(matchDay.id, matchDay.date);
    for (const userId of recipientIds) {
      await sendKakaoMessage({
        type: "VOTE_REMINDER",
        userId,
        message,
        matchDayId: matchDay.id,
        ruleId: rule.id,
      });
    }
    if (recipientIds.length === 0) {
      // 대상자가 0명이어도 마커를 남겨 다음 실행에서 같은 (경기일, 규칙) 조합을 재검사하지 않는다.
      await sendKakaoMessage({
        type: "VOTE_REMINDER",
        message: "대상자 없음(전원 응답 완료 또는 수신 동의자 없음)",
        matchDayId: matchDay.id,
        ruleId: rule.id,
      });
    }
    results.voteReminderNotified += recipientIds.length;
  }

  return NextResponse.json({ ok: true, ...results });
}
