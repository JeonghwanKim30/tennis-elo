import { prisma } from "@/lib/prisma";
import { avatarSrc } from "@/lib/avatar";
import { banUserAction } from "./actions";
import { UserManagementList } from "./UserManagementList";

export async function UserManagementSection({ currentAdminId }: { currentAdminId: string }) {
  // 거절/추방된 회원은 목록 조회 단계에서 아예 제외한다 — DB에는 상태값으로
  // 남아있지만(경기 이력 보존을 위해 소프트 삭제), 관리자 화면에는 승인 대기 중이거나
  // 정상 활동 중인 회원만 노출한다.
  const users = await prisma.user.findMany({
    where: { status: { in: ["PENDING", "ACTIVE"] } },
    orderBy: { createdAt: "desc" },
  });

  const plainUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    role: u.role,
    status: u.status as "PENDING" | "ACTIVE",
    avatarSrc: avatarSrc(u),
  }));

  return <UserManagementList users={plainUsers} currentAdminId={currentAdminId} banAction={banUserAction} />;
}
