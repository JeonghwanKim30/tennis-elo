import { CloseIcon } from "@/components/icons";

// 경기 카드 우상단에 붙는 삭제(X) 버튼 — 배경/테두리 없이 은은한 무채색
// 아이콘만 놓는 심플한 스타일. 카드 안의 다른 <form>과 형제 관계로 두면
// 되므로(중첩 X) 위치는 이 컴포넌트가 스스로 잡지 않고, 호출하는 쪽이 flex
// 레이아웃 안에서 배치한다.
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
        className="btn-press touch-target flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:text-gray-600"
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
