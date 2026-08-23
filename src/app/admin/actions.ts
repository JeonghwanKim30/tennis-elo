"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { INITIAL_RATING } from "@/lib/elo";
import { applyEloForMatch, recalculateAllElo } from "@/lib/eloEngine";
import { matchScoreSchema } from "@/lib/validation";
import { dateOnly } from "@/lib/date";
import type { MatchResult } from "@/generated/prisma/client";

export interface MatchScoreState {
  error?: string;
}

export interface CreateDayState {
  error?: string;
}

// recalculateAllElo는 남아있는 승인된 경기를 전부 순서대로 재생하며 매치마다
// 여러 번 원격 DB 왕복을 한다 — 경기 수가 늘어나면 Prisma의 기본 트랜잭션
// 타임아웃(5초)을 넘기기 쉬워, 재계산이 필요할 수 있는 삭제 트랜잭션에는
// 넉넉한 타임아웃을 지정한다.
const RECALC_TRANSACTION_OPTIONS = { timeout: 30_000 };

export async function createMatchDayAction(
  _prevState: CreateDayState,
  formData: FormData
): Promise<CreateDayState> {
  const admin = await requireAdmin();

  const dateStr = formData.get("date");
  if (typeof dateStr !== "string" || !dateStr) {
    return { error: "날짜를 입력해주세요." };
  }
  // dateOnly()는 "YYYY-MM-DD"를 항상 UTC 자정 Date로 고정해서, 서버가 어느
  // 타임존에서 돌든(대부분 UTC) 입력받은 달력 날짜 그대로 저장되게 한다 —
  // KST 기준 "오늘" 비교(kstToday, lib/date.ts)와 동일한 규칙을 공유한다.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { error: "날짜가 올바르지 않습니다." };
  }
  const date = dateOnly(dateStr);
  if (Number.isNaN(date.getTime())) {
    return { error: "날짜가 올바르지 않습니다." };
  }

  const timeStr = formData.get("time");
  const time = typeof timeStr === "string" && timeStr.trim() ? timeStr.trim() : null;
  const locationStr = formData.get("location");
  const location = typeof locationStr === "string" && locationStr.trim() ? locationStr.trim() : null;

  const existing = await prisma.matchDay.findUnique({ where: { date } });
  if (existing) {
    redirect(`/matches/${existing.id}`);
  }

  const day = await prisma.matchDay.create({
    data: { date, time, location, createdBy: admin.id },
  });
  redirect(`/matches/${day.id}`);
}

/**
 * 회원을 추방한다 — 실제 행을 지우면 그동안의 경기 이력/ELO 히스토리까지
 * 함께 사라지므로, 상태만 BANNED로 바꿔 로그인과 공개 목록(랭킹/참가자 추가
 * 등)에서 제외되게 한다. 자기 자신은 추방할 수 없다.
 *
 * 전화번호는 `banned_{userId}`로 마스킹해서 원래 번호를 즉시 풀어준다 —
 * 마스킹하지 않으면 그 번호가 phone 컬럼의 UNIQUE 제약을 계속 붙들고 있어서,
 * 실제로는 아무도 안 쓰는 번호인데도 재가입/번호 변경 시 "이미 등록된
 * 번호입니다" 오류가 나는 문제가 있었다.
 */
export async function banUserAction(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) return;

  await prisma.user.update({
    where: { id: userId },
    data: { status: "BANNED", phone: `banned_${userId}` },
  });

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
}

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

/**
 * 가입 신청을 거절한다. 거절된 신청자는 한 번도 ACTIVE였던 적이 없어
 * EloRating/Match/MatchDayParticipant 등 어떤 이력도 가질 수 없으므로
 * (모든 인증된 액션은 ACTIVE 상태를 요구한다), 상태만 바꾸는 대신 행을
 * 완전히 삭제한다 — 그래야 같은 이름/전화번호로 바로 재가입할 수 있다.
 * (반대로 추방(BANNED)은 추방 전까지 실제 활동 이력이 있을 수 있어 행을
 * 지우지 않고 전화번호만 마스킹한다. banUserAction 참고.)
 */
export async function rejectUserAction(userId: string) {
  await requireAdmin();
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
}

export async function enterMatchScoreAction(
  matchId: string,
  _prevState: MatchScoreState,
  formData: FormData
): Promise<MatchScoreState> {
  const admin = await requireAdmin();

  const parsed = matchScoreSchema.safeParse({
    teamAScore: formData.get("teamAScore"),
    teamBScore: formData.get("teamBScore"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "점수를 확인해주세요." };
  }
  const { teamAScore, teamBScore } = parsed.data;
  const result: MatchResult =
    teamAScore > teamBScore ? "TEAM_A_WIN" : teamAScore < teamBScore ? "TEAM_B_WIN" : "DRAW";

  const matchDayId = await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUniqueOrThrow({ where: { id: matchId } });
    if (match.status !== "PENDING") return match.matchDayId;

    // match는 아직 점수가 저장되기 전(PENDING)이므로 방금 입력받은 점수를 함께 넘겨준다.
    await applyEloForMatch(tx, { ...match, teamAScore, teamBScore }, result);

    const maxSeq = await tx.match.aggregate({ _max: { approvalSeq: true } });
    const nextSeq = (maxSeq._max.approvalSeq ?? 0) + 1;

    await tx.match.update({
      where: { id: match.id },
      data: {
        status: "APPROVED",
        result,
        teamAScore,
        teamBScore,
        approvedAt: new Date(),
        approvedBy: admin.id,
        approvalSeq: nextSeq,
      },
    });

    return match.matchDayId;
  });

  revalidatePath("/admin");
  revalidatePath("/matches");
  revalidatePath(`/matches/${matchDayId}`);
  revalidatePath("/leaderboard");
  revalidatePath("/profile");

  return {};
}

/**
 * 경기를 완전히 삭제한다 (예정된 경기 취소, 완료된 경기 삭제 공용).
 * 이미 ELO에 반영된(APPROVED) 경기였다면 전체 경기를 approvalSeq 순서대로
 * 다시 재생해 ELO/전적을 재계산한다 (ELO는 순서 의존적인 계산이라 부분 롤백이 불가능하다).
 */
export async function deleteMatchAction(matchId: string) {
  await requireAdmin();

  const matchDayId = await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUniqueOrThrow({ where: { id: matchId } });
    const wasApproved = match.status === "APPROVED";

    await tx.match.delete({ where: { id: matchId } });

    if (wasApproved) {
      await recalculateAllElo(tx);
    }

    return match.matchDayId;
  }, RECALC_TRANSACTION_OPTIONS);

  revalidatePath("/admin");
  revalidatePath("/matches");
  revalidatePath(`/matches/${matchDayId}`);
  revalidatePath("/leaderboard");
  revalidatePath("/profile");
}

/**
 * 경기 일자 전체를 삭제한다 (관리자 전용). 스키마의 cascade 설정
 * (Match -> onDelete: Cascade, MatchDayParticipant -> onDelete: Cascade,
 * EloHistory -> onDelete: Cascade)에 따라 그 날짜에 속한 경기·참석 투표
 * 내역·ELO 히스토리가 DB 레벨에서 함께 삭제된다. 그중 이미 ELO에 반영된
 * (APPROVED) 경기가 하나라도 있었다면, deleteMatchAction과 동일하게 남은
 * 전체 경기를 approvalSeq 순서대로 재생해 ELO/전적을 재계산한다.
 */
export async function deleteMatchDayAction(dayId: string) {
  await requireAdmin();

  await prisma.$transaction(async (tx) => {
    const matches = await tx.match.findMany({ where: { matchDayId: dayId } });
    const hadApprovedMatch = matches.some((m) => m.status === "APPROVED");

    await tx.matchDay.delete({ where: { id: dayId } });

    if (hadApprovedMatch) {
      await recalculateAllElo(tx);
    }
  }, RECALC_TRANSACTION_OPTIONS);

  revalidatePath("/admin");
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
  revalidatePath("/profile");
}
