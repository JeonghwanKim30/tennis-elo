import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { avatarSrc } from "@/lib/avatar";
import { Avatar } from "@/components/Avatar";
import { TierBadge, PlacementBadge } from "@/components/TierBadge";
import { TierInfoModal } from "@/components/TierInfoModal";
import { PlacementInfoModal } from "@/components/PlacementInfoModal";
import { getTier, isPlacement } from "@/lib/tier";
import { type TeamPlayer } from "@/components/TeamBadges";
import { ProfileStats } from "../ProfileStats";

type Tab = "all" | "singles" | "doubles";

// 타인의 프로필 조회 전용 페이지 — 공개 정보(사진/이름/자기소개/ELO/전적/티어)만
// 보여주고, 전화번호나 사진 변경·자기소개 편집·전화번호 변경 같은 편집 UI는
// 전혀 렌더링하지 않는다(본인 프로필의 /profile 페이지에만 존재).
export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { userId } = await params;
  const viewer = await getCurrentUser();
  // 본인 프로필은 편집 가능한 /profile이 정본(canonical) 주소다 — 그쪽으로 보낸다.
  if (viewer && viewer.id === userId) {
    redirect("/profile");
  }

  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "singles" || rawTab === "doubles" ? rawTab : "all";

  const typeFilter = tab === "singles" ? "SINGLES" : tab === "doubles" ? "DOUBLES" : undefined;

  // 아래 4개 쿼리는 서로 결과를 참조하지 않고 전부 userId(또는 아무 조건
  // 없음)만 있으면 되므로 병렬로 보낸다 — 순서대로 기다리면 원격 DB 왕복이
  // 4번 쌓여 그대로 지연으로 이어진다. allUsers를 매치 등장 선수로 필터링
  // 하지 않고 통째로 가져오는 이유는 ScoreSection/profile(본인)과 동일하다
  // (매치 조회 "다음"에야 그 결과로 유저를 또 조회하는 두 번째 왕복 제거).
  const [profileUser, ratings, matches, allUsers] = await Promise.all([
    // 탈퇴/추방/미승인 회원은 공개 프로필 대상이 아니다(다른 공개 목록들과 동일한 기준).
    // 공개 프로필에 실제로 쓰는 필드만 선택 — 전화번호(비공개 정책)나 pinHash
    // 같은 민감/불필요 컬럼을 서버 메모리로도 끌어오지 않는다.
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        bio: true,
        status: true,
        gender: true,
        profileImage: true,
        profileImageType: true,
      },
    }),
    prisma.eloRating.findMany({ where: { userId } }),
    prisma.match.findMany({
      where: {
        status: "APPROVED",
        ...(typeFilter ? { type: typeFilter } : {}),
        OR: [
          { teamAPlayer1: userId },
          { teamAPlayer2: userId },
          { teamBPlayer1: userId },
          { teamBPlayer2: userId },
        ],
      },
      include: { matchDay: true, eloHistory: { select: { userId: true, delta: true } } },
      orderBy: { approvalSeq: "desc" },
      // 경기 이력이 쌓일수록 매번 전체를 다 가져오면 페이지가 계속 느려지므로
      // 최근 30건으로 상한을 둔다(관리자 "완료된 경기" 목록과 동일한 기준).
      take: 30,
    }),
    prisma.user.findMany({
      select: { id: true, name: true, gender: true, profileImage: true, profileImageType: true },
    }),
  ]);
  if (!profileUser || profileUser.status !== "ACTIVE") {
    notFound();
  }

  const singles = ratings.find((r) => r.type === "SINGLES");
  const doubles = ratings.find((r) => r.type === "DOUBLES");
  // 이름 옆 대표 티어는 단식/복식 중 더 높은 쪽 ELO 기준(종목별 세부 티어는
  // ProfileStats의 ELO 카드에 따로 표시된다). /profile의 본인 프로필과 동일한 규칙.
  const tierRating = Math.max(singles?.rating ?? 1200, doubles?.rating ?? 1200);
  const singlesTotal = (singles?.wins ?? 0) + (singles?.losses ?? 0) + (singles?.draws ?? 0);
  const doublesTotal = (doubles?.wins ?? 0) + (doubles?.losses ?? 0) + (doubles?.draws ?? 0);
  const peakTotal = (singles?.rating ?? 1200) >= (doubles?.rating ?? 1200) ? singlesTotal : doublesTotal;
  const headerPlacement = isPlacement(peakTotal);

  const playerById = new Map<string, TeamPlayer>(
    allUsers.map((p) => [p.id, { id: p.id, name: p.name, avatarSrc: avatarSrc(p) }])
  );

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <div className="flex items-start gap-4">
        <Avatar src={avatarSrc(profileUser)} size="lg" className="shadow-md shadow-primary/10" />
        <div className="min-w-0 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold">{profileUser.name}</h1>
            {headerPlacement ? <PlacementBadge /> : <TierBadge rating={tierRating} />}
            {headerPlacement ? (
              <PlacementInfoModal completed={peakTotal} />
            ) : (
              <TierInfoModal currentTierKey={getTier(tierRating).key} />
            )}
          </div>
        </div>
      </div>

      <div className="surface-card p-4 shadow-sm">
        <p className="text-sm text-foreground/90">
          {profileUser.bio || (
            <span className="text-muted-foreground">아직 등록된 자기소개가 없습니다.</span>
          )}
        </p>
      </div>

      <ProfileStats
        basePath={`/profile/${userId}`}
        tab={tab}
        singles={singles}
        doubles={doubles}
        matches={matches}
        playerById={playerById}
      />
    </main>
  );
}
