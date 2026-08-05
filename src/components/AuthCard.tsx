import { TeddiWordmark } from "@/components/TeddiMark";

export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <TeddiWordmark size="lg" layout="column" />
        </div>
        <div className="surface-card p-6">
          <h2 className="mb-4 text-center text-lg font-semibold">{title}</h2>
          {children}
        </div>
      </div>
    </main>
  );
}
