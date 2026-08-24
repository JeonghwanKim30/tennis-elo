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
import { RecapButton } from "./RecapButton";

export default async function ProfilePage() {
  const authUser = await requireUser();

  // 전체/단식/복식 탭은 ProfileStats(클라이언트)가 matches 배열을 그대로
  // 받아 내부 상태로 즉시 필터링하므로, 여기서는 종목 구분 없이 최근 경기를
  // 한 번만 조회하면 된다(탭 전환 때마다 다시 조회할 필요가 없다).
  // getCurrentUser()(=requireUser)는 라우팅마다 NavBar가 부르는 가벼운 인증용
  // select라 name/bio/profileImage 같은 프로필 전용 필드가 없어 이 페이지에서
  // 따로 조회해야 하는데, 아래 4개 쿼리는 서로 결과값을 참조하지 않고 전부
  // authUser.id(또는 아무 조건 없음)만 있으면 되므로 굳이 순서대로 기다릴
  // 이유가 없다 — Promise.all로 한 번에 보내 원격 DB 왕복 횟수를 4번(순차)에서
  // 1번(병렬 배치)으로 줄인다. allUsers를 매치에 등장한 선수 ID로 필터링하지
  // 않고 통째로 가져오는 것도 같은 이유(매치 조회 결과가 나온 "다음에야" 그
  // 선수 ID로 유저를 또 조회하는 두 번째 왕복을 없애기 위해서)다 — 동호회
  // 규모의 유저 수는 전부 가져와도 가볍고, 추방/탈퇴 유저가 과거 경기에
  // 등장해도 빠짐없이 이름/아바타를 표시할 수 있다는 장점도 있다.
  const [user, ratings, matches, allUsers] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        phone: true,
        bio: true,
        gender: true,
        profileImage: true,
        profileImageType: true,
        lastSeenTierSingles: true,
        lastSeenTierDoubles: true,
      },
    }),
    prisma.eloRating.findMany({ where: { userId: authUser.id } }),
    prisma.match.findMany({
      where: {
        status: "APPROVED",
        OR: [
          { teamAPlayer1: authUser.id },
          { teamAPlayer2: authUser.id },
          { teamBPlayer1: authUser.id },
          { teamBPlayer2: authUser.id },
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

  const playerById = new Map<string, TeamPlayer>(
    allUsers.map((p) => [p.id, { id: p.id, name: p.name, avatarSrc: avatarSrc(p) }])
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

      <RecapButton />

      <TierChangeBanner
        singlesChange={singlesTierChange}
        doublesChange={doublesTierChange}
        currentSinglesKey={currentSinglesTier.key}
        currentDoublesKey={currentDoublesTier.key}
      />

      <BioEditor initialBio={user.bio ?? ""} />

      <ProfileStats singles={singles} doubles={doubles} matches={matches} playerById={playerById} />
    </main>
  );
}
