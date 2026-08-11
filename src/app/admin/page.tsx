import { requireAdmin } from "@/lib/session";
import { AdminTabs, type AdminTab } from "./AdminTabs";
import { RegisterSection } from "./RegisterSection";
import { ScoreSection } from "./ScoreSection";
import { SignupsSection } from "./SignupsSection";
import { UserManagementSection } from "./UserManagementSection";

const VALID_TABS: AdminTab[] = ["register", "score", "signups", "users"];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const admin = await requireAdmin();
  const { tab: rawTab } = await searchParams;
  const tab: AdminTab = VALID_TABS.includes(rawTab as AdminTab) ? (rawTab as AdminTab) : "score";

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <h1 className="text-2xl font-bold">관리자 대시보드</h1>
      <AdminTabs active={tab} />

      {tab === "register" && <RegisterSection />}
      {tab === "score" && <ScoreSection />}
      {tab === "signups" && <SignupsSection />}
      {tab === "users" && <UserManagementSection currentAdminId={admin.id} />}
    </main>
  );
}
