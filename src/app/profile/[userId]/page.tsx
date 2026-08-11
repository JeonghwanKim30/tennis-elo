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

  // 탈퇴/추방/미승인 회원은 공개 프로필 대상이 아니다(다른 공개 목록들과 동일한 기준).
  // 공개 프로필에 실제로 쓰는 필드만 선택 — 전화번호(비공개 정책)나 pinHash
  // 같은 민감/불필요 컬럼을 서버 메모리로도 끌어오지 않는다.
  const profileUser = await prisma.user.findUnique({
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
  });
  if (!profileUser || profileUser.status !== "ACTIVE") {
    notFound();
  }

  const ratings = await prisma.eloRating.findMany({ where: { userId } });
  const singles = ratings.find((r) => r.type === "SINGLES");
  const doubles = ratings.find((r) => r.type === "DOUBLES");
  // 이름 옆 대표 티어는 단식/복식 중 더 높은 쪽 ELO 기준(종목별 세부 티어는
  // ProfileStats의 ELO 카드에 따로 표시된다). /profile의 본인 프로필과 동일한 규칙.
  const tierRating = Math.max(singles?.rating ?? 1200, doubles?.rating ?? 1200);
  const singlesTotal = (singles?.wins ?? 0) + (singles?.losses ?? 0) + (singles?.draws ?? 0);
  const doublesTotal = (doubles?.wins ?? 0) + (doubles?.losses ?? 0) + (doubles?.draws ?? 0);
  const peakTotal = (singles?.rating ?? 1200) >= (doubles?.rating ?? 1200) ? singlesTotal : doublesTotal;
  const headerPlacement = isPlacement(peakTotal);

  const typeFilter = tab === "singles" ? "SINGLES" : tab === "doubles" ? "DOUBLES" : undefined;

  const matches = await prisma.match.findMany({
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
    include: { matchDay: true },
    orderBy: { approvalSeq: "desc" },
  });

  const playerIds = Array.from(
    new Set(
      matches.flatMap((m) =>
        [m.teamAPlayer1, m.teamAPlayer2, m.teamBPlayer1, m.teamBPlayer2].filter(
          (id): id is string => !!id
        )
      )
    )
  );
  const players = await prisma.user.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, name: true, gender: true, profileImage: true, profileImageType: true },
  });
  const playerById = new Map<string, TeamPlayer>(
    players.map((p) => [p.id, { id: p.id, name: p.name, avatarSrc: avatarSrc(p) }])
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
