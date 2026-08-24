import { prisma } from "@/lib/prisma";
import { avatarSrc } from "@/lib/avatar";
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

  // profileImage(Bytes → Uint8Array)는 서버 → 클라이언트 컴포넌트 경계를 못
  // 넘어간다(RSC 직렬화 과정에서 "ArrayBuffer is not detachable and could
  // not be cloned" 빌드 에러로 이어진다 — 작은 버퍼는 내부적으로 공유
  // ArrayBuffer 풀을 쓰는 경우가 있어 detach가 안 될 수 있다). 다른
  // 클라이언트 컴포넌트들과 동일하게, 문자열 avatarSrc로 미리 변환해서
  // 넘긴다(lib/avatar.ts).
  const toRow = (r: (typeof singlesRows)[number] | (typeof doublesRows)[number]) => ({
    ...r,
    user: { name: r.user.name, gender: r.user.gender, avatarSrc: avatarSrc(r.user) },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <LeaderboardClient singlesRows={singlesRows.map(toRow)} doublesRows={doublesRows.map(toRow)} />
    </main>
  );
}
