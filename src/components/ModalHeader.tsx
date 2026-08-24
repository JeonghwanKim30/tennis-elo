import { CloseIcon } from "@/components/icons";

// 회원가입/전화번호 수정 등 "제목 + 우측 상단 X 닫기" 헤더가 똑같이
// 반복되던 부분을 모았다.
export function ModalHeader({
  id,
  title,
  onClose,
  titleClassName = "text-lg font-semibold",
}: {
  id: string;
  title: string;
  onClose: () => void;
  titleClassName?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 id={id} className={titleClassName}>
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="btn-press touch-target flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
      >
        <CloseIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
