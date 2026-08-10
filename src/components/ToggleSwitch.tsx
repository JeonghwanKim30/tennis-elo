"use client";

// 앱 전체에서 공용으로 쓰는 iOS 스타일 토글 스위치. 켜짐 = 브랜드 그린,
// 꺼짐 = muted 회색. 실제 상태 변경(서버 액션 호출 등)은 부모가 onChange로
// 처리하고, 이 컴포넌트는 순수하게 보여주기+클릭만 담당한다.
export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`btn-press touch-target relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
