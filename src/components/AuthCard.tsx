import { TeddiWordmark } from "@/components/TeddiMark";

export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    // 100vh는 iOS Safari에서 주소창을 포함한 "레이아웃 뷰포트" 전체 높이라
    // 실제로 보이는 영역보다 커서, 주소창이 떠 있는 동안 카드가 화면 밖으로
    // 밀려나거나 스크롤이 생길 수 있다. dvh(동적 뷰포트 높이)는 주소창이
    // 접히고 펼쳐질 때마다 실제로 보이는 영역에 맞춰 갱신된다.
    <main className="flex min-h-[calc(100dvh-57px)] items-center justify-center px-4 py-12">
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
