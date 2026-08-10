// 외부 아이콘 라이브러리 없이, 내비게이션에 필요한 만큼만 인라인 SVG로 직접 그린다.
// 모두 24x24 기준 stroke 아이콘 — currentColor를 써서 텍스트 색을 그대로 물려받는다.

type IconProps = { className?: string };

const common = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function MatchesIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
      <circle cx="8.5" cy="14.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="17.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LeaderboardIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5A1.5 1.5 0 0 0 3 7.5 3.5 3.5 0 0 0 6.5 11H7" />
      <path d="M17 6h2.5A1.5 1.5 0 0 1 21 7.5 3.5 3.5 0 0 1 17.5 11H17" />
    </svg>
  );
}

export function H2HIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="6" cy="7" r="3" />
      <circle cx="18" cy="7" r="3" />
      <path d="M3.5 20a3.5 5.5 0 0 1 5 0" />
      <path d="M15.5 20a3.5 5.5 0 0 1 5 0" />
      <path d="M10.5 13.5 12 12l1.5 1.5M12 12v7" />
    </svg>
  );
}

export function ProfileIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 6 0 0 1 15 0" />
    </svg>
  );
}

export function AdminIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function LoginIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 8l4 4-4 4" />
      <path d="M14 12H3" />
    </svg>
  );
}

export function SignupIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 5.5 0 0 1 13 0" />
      <path d="M18 8v6M21 11h-6" />
    </svg>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H7" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function PencilIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M4 20l4-1 11-11a2.12 2.12 0 0 0-3-3L5 16l-1 4Z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6" />
      <circle cx="12" cy="7.5" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

// 카카오 브랜드 말풍선 — 다른 아이콘들과 달리 채워진 형태(fill)로 그린다.
export function KakaoTalkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        fill="currentColor"
        d="M12 3.5C6.75 3.5 2.5 6.86 2.5 11c0 2.66 1.77 4.99 4.44 6.33-.2.72-.71 2.58-.82 2.98-.13.5.18.49.38.36.16-.1 2.53-1.72 3.56-2.42.63.09 1.28.14 1.94.14 5.25 0 9.5-3.36 9.5-7.5S17.25 3.5 12 3.5Z"
      />
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}
