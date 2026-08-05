import { prisma } from "@/lib/prisma";
import { avatarSrc } from "@/lib/avatar";
import { approveUserAction, rejectUserAction } from "./actions";
import { PendingUsersList } from "./PendingUsersList";

export async function SignupsSection() {
  const pendingUsers = await prisma.user.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, phone: true, gender: true, profileImage: true, profileImageType: true },
  });

  const plainUsers = pendingUsers.map((u) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    avatarSrc: avatarSrc(u),
  }));

  return (
    <PendingUsersList users={plainUsers} approveAction={approveUserAction} rejectAction={rejectUserAction} />
  );
}
