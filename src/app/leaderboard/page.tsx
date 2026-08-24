import { prisma } from "@/lib/prisma";
import { LeaderboardClient } from "./LeaderboardClient";

const userSelect = { name: true, gender: true, profileImage: true, profileImageType: true } as const;
// 탈퇴/추방 등으로 더 이상 활성 상태가 아닌 회원은 공개 랭킹에서 제외한다
// (경기 이력/ELO 히스토리 자체는 그대로 보존된다).
const activeFilter = { user: { status: "ACTIVE" as const } };

// 단식/성별 필터는 전부 클라이언트에서 즉시 처리한다(LeaderboardClient 참고) —
// 그러려면 단식/복식 데이터를 처음부터 둘 다 갖고 있어야 하므로, 여기서
// 두 종목을 한 번에 병렬로 조회해 클라이언트에 통째로 넘긴다. 동호회 규모의
// 랭킹 테이블은 두 종목 합쳐도 가벼워서, 탭 전환마다 매번 다시 조회하는
// 것보다 처음에 한 번 다 받아두는 쪽이 훨씬 빠르다.
export default async function LeaderboardPage() {
  const [singlesRows, doublesRows] = await Promise.all([
    prisma.eloRating.findMany({
      where: { type: "SINGLES", ...activeFilter },
      include: { user: { select: userSelect } },
    }),
    prisma.eloRating.findMany({
      where: { type: "DOUBLES", ...activeFilter },
      include: { user: { select: userSelect } },
    }),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <LeaderboardClient singlesRows={singlesRows} doublesRows={doublesRows} />
    </main>
  );
}
