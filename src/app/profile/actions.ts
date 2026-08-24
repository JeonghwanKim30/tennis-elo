"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { bioSchema, phoneSchema } from "@/lib/validation";
import { lastFourDigits } from "@/lib/phone";
import { avatarSrc } from "@/lib/avatar";
import { dateOnly } from "@/lib/date";
import { getTier, isPlacement } from "@/lib/tier";
import { computeRecapStats, type MatchOutcome, type RecapMatchRecord, type RecapStats } from "@/lib/recap";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export interface ProfileImageState {
  error?: string;
}

export async function updateProfileImageAction(dataUrl: string): Promise<ProfileImageState> {
  const user = await requireUser();

  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return { error: "이미지 형식이 올바르지 않습니다." };
  }
  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    return { error: "이미지 용량이 너무 큽니다." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { profileImage: buffer, profileImageType: mimeType },
  });

  revalidatePath("/profile");
  return {};
}

export interface BioState {
  error?: string;
}

export async function updateBioAction(bio: string): Promise<BioState> {
  const user = await requireUser();

  const parsed = bioSchema.safeParse(bio);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "자기소개를 확인해주세요." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { bio: parsed.data || null },
  });

  revalidatePath("/profile");
  revalidatePath(`/profile/${user.id}`);
  return {};
}

export interface PhoneState {
  error?: string;
  success?: boolean;
  phone?: string;
}

/**
 * 전화번호를 바꾸면 로그인 PIN(휴대폰 뒷자리 4자리)도 그 번호 기준으로
 * 자동으로 다시 계산해 함께 갱신한다 — 사용자가 PIN을 따로 재설정할
 * 필요가 없다.
 */
export async function updatePhoneAction(
  _prevState: PhoneState,
  formData: FormData
): Promise<PhoneState> {
  const user = await requireUser();

  const parsed = phoneSchema.safeParse(formData.get("phone"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "전화번호를 확인해주세요." };
  }
  const phone = parsed.data;

  if (phone !== user.phone) {
    // signupAction과 동일한 이유로 ACTIVE/PENDING 상태만 "이미 등록됨"으로
    // 취급한다 — REJECTED는 삭제되고 BANNED는 전화번호가 마스킹되어 있어
    // 실제로는 충돌하지 않지만, 조회 조건에서도 한 번 더 방어한다.
    const existing = await prisma.user.findFirst({
      where: { phone, status: { in: ["ACTIVE", "PENDING"] } },
      select: { id: true },
    });
    if (existing) {
      return { error: "이미 등록된 휴대폰 번호입니다." };
    }
  }

  const pin = lastFourDigits(phone);
  const pinHash = await bcrypt.hash(pin, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { phone, pinHash },
  });

  revalidatePath("/profile");
  return { success: true, phone };
}

/**
 * 승급/강등 안내 배너를 화면에 띄운 직후 호출해, "마지막으로 확인한 티어"를
 * 지금 티어로 갱신한다 — 그래야 같은 변화를 다음 방문 때 또 알리지 않는다.
 */
export async function markTierSeenAction(singlesTierKey: string, doublesTierKey: string) {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenTierSingles: singlesTierKey, lastSeenTierDoubles: doublesTierKey },
  });
}

export type RecapMode = "month" | "season";

export interface RecapCardData {
  stats: RecapStats;
  /** bestPartner/bestOpponent/worstOpponent가 가리키는 유저 id -> 이름. */
  nameById: Record<string, string>;
  userName: string;
  avatarSrc: string;
  tierLabel: string;
  tierColor: string;
  tierTextColor: string;
  isPlacementNow: boolean;
  /** "2026년 8월" 또는 "전체 시즌". */
  periodLabel: string;
}

export interface RecapState {
  error?: string;
  data?: RecapCardData;
}

/**
 * 기간(월간/시즌) 리캡 카드용 통계를 계산한다. 순수 집계 로직은
 * lib/recap.ts(computeRecapStats)에 있고, 여기서는 DB 조회 + 그 결과를
 * RecapMatchRecord로 변환 + 이름 조회만 담당한다.
 * @param mode "month"면 monthStr("YYYY-MM")의 1일 00:00:00 ~ 다음 달 1일
 *   직전까지, "season"이면 기간 제한 없이 전체 이력을 집계한다.
 */
export async function getRecapStatsAction(mode: RecapMode, monthStr?: string): Promise<RecapState> {
  const user = await requireUser();

  let dateFilter: { gte: Date; lt: Date } | undefined;
  let periodLabel: string;

  if (mode === "month") {
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
      return { error: "월 형식이 올바르지 않습니다." };
    }
    const start = dateOnly(`${monthStr}-01`);
    if (Number.isNaN(start.getTime())) {
      return { error: "월 형식이 올바르지 않습니다." };
    }
    const endExclusive = new Date(start);
    endExclusive.setUTCMonth(endExclusive.getUTCMonth() + 1);
    dateFilter = { gte: start, lt: endExclusive };
    const [yearStr, monthPart] = monthStr.split("-");
    periodLabel = `${yearStr}년 ${Number(monthPart)}월`;
  } else {
    periodLabel = "전체 시즌";
  }

  const [matches, ratings, profileUser] = await Promise.all([
    prisma.match.findMany({
      where: {
        status: "APPROVED",
        ...(dateFilter ? { matchDay: { date: dateFilter } } : {}),
        OR: [
          { teamAPlayer1: user.id },
          { teamAPlayer2: user.id },
          { teamBPlayer1: user.id },
          { teamBPlayer2: user.id },
        ],
      },
      include: {
        matchDay: { select: { date: true } },
        eloHistory: { where: { userId: user.id }, select: { delta: true, ratingAfter: true } },
      },
      orderBy: { approvalSeq: "asc" },
    }),
    prisma.eloRating.findMany({ where: { userId: user.id } }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, gender: true, profileImage: true, profileImageType: true },
    }),
  ]);
  if (!profileUser) {
    return { error: "유저 정보를 찾을 수 없습니다." };
  }

  const records: RecapMatchRecord[] = matches.map((match) => {
    const isTeamA = match.teamAPlayer1 === user.id || match.teamAPlayer2 === user.id;
    const outcome: MatchOutcome =
      match.result === "DRAW" ? "DRAW" : (match.result === "TEAM_A_WIN") === isTeamA ? "WIN" : "LOSS";
    const teammateId = isTeamA
      ? match.teamAPlayer1 === user.id
        ? match.teamAPlayer2
        : match.teamAPlayer1
      : match.teamBPlayer1 === user.id
        ? match.teamBPlayer2
        : match.teamBPlayer1;
    const opponentIds = (isTeamA ? [match.teamBPlayer1, match.teamBPlayer2] : [match.teamAPlayer1, match.teamAPlayer2]).filter(
      (id): id is string => !!id
    );
    const hist = match.eloHistory[0];
    return {
      matchId: match.id,
      approvalSeq: match.approvalSeq ?? 0,
      date: match.matchDay.date,
      type: match.type,
      outcome,
      delta: hist?.delta ?? 0,
      ratingAfter: hist?.ratingAfter ?? 1200,
      opponentIds,
      teammateId: teammateId ?? null,
    };
  });

  const stats = computeRecapStats(records);

  const idsToResolve = [stats.bestPartner?.playerId, stats.bestOpponent?.playerId, stats.worstOpponent?.playerId].filter(
    (id): id is string => !!id
  );
  const players = idsToResolve.length
    ? await prisma.user.findMany({ where: { id: { in: idsToResolve } }, select: { id: true, name: true } })
    : [];
  const nameById = Object.fromEntries(players.map((p) => [p.id, p.name]));

  const singles = ratings.find((r) => r.type === "SINGLES");
  const doubles = ratings.find((r) => r.type === "DOUBLES");
  const singlesTotal = (singles?.wins ?? 0) + (singles?.losses ?? 0) + (singles?.draws ?? 0);
  const doublesTotal = (doubles?.wins ?? 0) + (doubles?.losses ?? 0) + (doubles?.draws ?? 0);
  const tierRating = Math.max(singles?.rating ?? 1200, doubles?.rating ?? 1200);
  const peakTotal = (singles?.rating ?? 1200) >= (doubles?.rating ?? 1200) ? singlesTotal : doublesTotal;
  const placementNow = isPlacement(peakTotal);
  const tier = getTier(tierRating);

  return {
    data: {
      stats,
      nameById,
      userName: profileUser.name,
      avatarSrc: avatarSrc(profileUser),
      tierLabel: placementNow ? "배치 중" : tier.label,
      tierColor: placementNow ? "var(--muted)" : tier.color,
      tierTextColor: placementNow ? "var(--muted-foreground)" : tier.textColor,
      isPlacementNow: placementNow,
      periodLabel,
    },
  };
}
