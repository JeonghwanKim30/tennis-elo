import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { avatarSrc } from "@/lib/avatar";
import { type TeamPlayer } from "@/components/TeamBadges";
import { TierBadge, PlacementBadge } from "@/components/TierBadge";
import { TierInfoModal } from "@/components/TierInfoModal";
import { PlacementInfoModal } from "@/components/PlacementInfoModal";
import { getTier, compareTierChange, isPlacement } from "@/lib/tier";
import { AvatarUploader } from "./AvatarUploader";
import { BioEditor } from "./BioEditor";
import { PhoneEditor } from "./PhoneEditor";
import { ProfileStats } from "./ProfileStats";
import { TierChangeBanner } from "./TierChangeBanner";

type Tab = "all" | "singles" | "doubles";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "singles" || rawTab === "doubles" ? rawTab : "all";

  const ratings = await prisma.eloRating.findMany({ where: { userId: user.id } });
  const singles = ratings.find((r) => r.type === "SINGLES");
  const doubles = ratings.find((r) => r.type === "DOUBLES");
  // 이름 옆 대표 티어는 단식/복식 중 더 높은 쪽 ELO를 기준으로 매긴다
  // (리그 오브 레전드의 "피크 랭크"처럼, 두 종목 중 더 잘하는 쪽을 대표로 보여준다).
  // 종목별 세부 티어는 ProfileStats의 단식/복식 ELO 카드에 각각 따로 표시된다.
  const tierRating = Math.max(singles?.rating ?? 1200, doubles?.rating ?? 1200);
  // 대표 티어가 어느 종목 기준인지에 따라 그 종목의 완료 경기 수로 배치 여부를 판단한다
  // (0전 0패 신규 유저가 정식 티어처럼 보이는 문제를 막는다).
  const singlesTotal = (singles?.wins ?? 0) + (singles?.losses ?? 0) + (singles?.draws ?? 0);
  const doublesTotal = (doubles?.wins ?? 0) + (doubles?.losses ?? 0) + (doubles?.draws ?? 0);
  const peakTotal = (singles?.rating ?? 1200) >= (doubles?.rating ?? 1200) ? singlesTotal : doublesTotal;
  const headerPlacement = isPlacement(peakTotal);

  // 마지막으로 확인한 티어와 지금 티어를 비교해 승급/강등 여부를 판단한다.
  // 경기 승패 입력(enterMatchScoreAction) -> ELO 반영은 이미 끝난 상태이고,
  // "그 유저가 내 프로필에 들어갔을 때" 알려주면 되므로 여기서만 계산하면 된다.
  const currentSinglesTier = getTier(singles?.rating ?? 1200);
  const currentDoublesTier = getTier(doubles?.rating ?? 1200);
  // 아직 배치 중인 종목은 정식 티어가 없는 상태이므로 승급/강등 배너를 띄우지 않는다.
  const singlesTierChange = isPlacement(singlesTotal)
    ? null
    : compareTierChange(user.lastSeenTierSingles, currentSinglesTier);
  const doublesTierChange = isPlacement(doublesTotal)
    ? null
    : compareTierChange(user.lastSeenTierDoubles, currentDoublesTier);

  const typeFilter = tab === "singles" ? "SINGLES" : tab === "doubles" ? "DOUBLES" : undefined;

  const matches = await prisma.match.findMany({
    where: {
      status: "APPROVED",
      ...(typeFilter ? { type: typeFilter } : {}),
      OR: [
        { teamAPlayer1: user.id },
        { teamAPlayer2: user.id },
        { teamBPlayer1: user.id },
        { teamBPlayer2: user.id },
      ],
    },
    include: { matchDay: true, eloHistory: { select: { userId: true, delta: true } } },
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
      {/* items-start + 살짝의 top padding으로 이름/전화번호가 아바타 머리 높이
          쪽에 오도록 맞춘다(기존에는 items-center라 아바타 정중앙에 맞춰져 있었음). */}
      <div className="flex items-start gap-4">
        <AvatarUploader currentSrc={avatarSrc(user)} />
        <div className="min-w-0 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold">{user.name}</h1>
            {headerPlacement ? <PlacementBadge /> : <TierBadge rating={tierRating} />}
            {headerPlacement ? (
              <PlacementInfoModal completed={peakTotal} />
            ) : (
              <TierInfoModal currentTierKey={getTier(tierRating).key} />
            )}
          </div>
          <div className="mt-1 truncate text-sm text-muted-foreground">
            <PhoneEditor initialPhone={user.phone} />
          </div>
        </div>
      </div>

      <TierChangeBanner
        singlesChange={singlesTierChange}
        doublesChange={doublesTierChange}
        currentSinglesKey={currentSinglesTier.key}
        currentDoublesKey={currentDoublesTier.key}
      />

      <BioEditor initialBio={user.bio ?? ""} />

      <ProfileStats
        basePath="/profile"
        tab={tab}
        singles={singles}
        doubles={doubles}
        matches={matches}
        playerById={playerById}
      />
    </main>
  );
}
