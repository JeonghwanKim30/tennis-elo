import { CloseIcon } from "@/components/icons";

// 네모 상자형 X 삭제 버튼 — 작고 눈에 튀지 않는 초록(브랜드 primary) 톤.
// 카드 안의 다른 <form>과 형제 관계로 두면 되므로(중첩 X) 위치는 이 컴포넌트가
// 스스로 잡지 않고, 호출하는 쪽이 flex 레이아웃 안에서 배치한다.
export function SquareDeleteButton({
  action,
  label,
}: {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        aria-label={label}
        className="btn-press touch-target flex h-6 w-6 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary"
      >
        <CloseIcon className="h-3 w-3" />
      </button>
    </form>
  );
}
