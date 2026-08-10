import { CloseIcon } from "@/components/icons";

// 관리자 경기 카드 모서리에 붙는 네모 상자형 X 삭제 버튼 — 다른 아이콘
// 버튼들과 달리 원형이 아니라 사각형으로 그려 "삭제 전용" 느낌을 낸다.
// 카드 안의 다른 <form>과 형제 관계로 두면 되므로(중첩 X) 카드 쪽에서
// position: relative를 잡아주고 이 컴포넌트는 절대 위치로 모서리에 붙는다.
export function SquareDeleteButton({
  action,
  label,
}: {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
}) {
  return (
    <form action={action} className="absolute top-3 right-3 z-10">
      <button
        type="submit"
        aria-label={label}
        className="btn-press touch-target flex h-7 w-7 items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive"
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
