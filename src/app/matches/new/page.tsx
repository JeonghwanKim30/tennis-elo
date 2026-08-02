import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { MatchForm } from "./MatchForm";

export default async function NewMatchPage() {
  await requireUser();

  const players = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">경기 등록</h1>
      <MatchForm players={players} />
    </main>
  );
}
