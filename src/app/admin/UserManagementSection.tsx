import { prisma } from "@/lib/prisma";
import { avatarSrc } from "@/lib/avatar";
import { banUserAction } from "./actions";
import { UserManagementList } from "./UserManagementList";

export async function UserManagementSection({ currentAdminId }: { currentAdminId: string }) {
  // 승인 대기(PENDING) 중인 회원은 "가입 승인" 탭의 몫이므로 여기서는 제외하고,
  // 이미 활동 중인(ACTIVE) 회원만 노출한다. 거절/추방된 회원은 DB에는 상태값으로
  // 남아있지만(경기 이력 보존을 위해 소프트 삭제), 목록 조회 단계에서 아예 걸러낸다.
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      gender: true,
      profileImage: true,
      profileImageType: true,
    },
  });

  const plainUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    role: u.role,
    avatarSrc: avatarSrc(u),
  }));

  return <UserManagementList users={plainUsers} currentAdminId={currentAdminId} banAction={banUserAction} />;
}
