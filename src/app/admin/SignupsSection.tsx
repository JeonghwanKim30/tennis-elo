import { prisma } from "@/lib/prisma";
import { approveUserAction, rejectUserAction } from "./actions";
import { PendingUsersList } from "./PendingUsersList";

export async function SignupsSection() {
  const pendingUsers = await prisma.user.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, phone: true },
  });

  return (
    <PendingUsersList users={pendingUsers} approveAction={approveUserAction} rejectAction={rejectUserAction} />
  );
}
