// 메인 화면용 "테니스 치는 곰돌이" 일러스트. 외부 이미지 생성 없이 순수 SVG로 그려서
// 브랜드 컬러에 맞춰 자유롭게 색을 바꿀 수 있고, 어느 해상도에서도 선명하다.
// prefers-reduced-motion인 경우 애니메이션은 globals.css에서 전부 꺼진다.
export function TennisBearHero({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 320"
      className={`hero-illustration ${className}`}
      role="img"
      aria-label="테니스 라켓을 든 테디베어"
    >
      <ellipse cx="160" cy="296" rx="72" ry="13" fill="#1f3b30" opacity="0.1" />

      <g className="bear-bounce">
        {/* 발 */}
        <ellipse cx="134" cy="283" rx="15" ry="10" fill="#c99b5f" />
        <ellipse cx="186" cy="283" rx="15" ry="10" fill="#c99b5f" />

        {/* 내려온 팔 */}
        <path
          d="M124 196c-14 14-22 30-24 46"
          fill="none"
          stroke="#eac48f"
          strokeWidth="24"
          strokeLinecap="round"
        />
        <circle cx="100" cy="244" r="14" fill="#c99b5f" />

        {/* 몸통 */}
        <rect x="114" y="178" width="92" height="102" rx="46" fill="#eac48f" />

        {/* 라켓을 든 팔 (별도 그룹으로 스윙 애니메이션) */}
        <g className="bear-arm" style={{ transformOrigin: "202px 190px" }}>
          <path
            d="M202 190c18-10 34-24 44-46"
            fill="none"
            stroke="#eac48f"
            strokeWidth="24"
            strokeLinecap="round"
          />
          <circle cx="250" cy="140" r="15" fill="#c99b5f" />
          <rect
            x="247"
            y="108"
            width="10"
            height="34"
            rx="5"
            fill="#5b4636"
            transform="rotate(18 252 125)"
          />
          <ellipse
            cx="272"
            cy="90"
            rx="26"
            ry="32"
            fill="#ffffff"
            fillOpacity="0.5"
            stroke="#2fbf71"
            strokeWidth="6"
            transform="rotate(18 272 90)"
          />
          <g
            stroke="#2fbf71"
            strokeOpacity="0.55"
            strokeWidth="1.5"
            transform="rotate(18 272 90)"
          >
            <line x1="256" y1="90" x2="288" y2="90" />
            <line x1="272" y1="62" x2="272" y2="118" />
            <line x1="261" y1="72" x2="283" y2="108" />
            <line x1="283" y1="72" x2="261" y2="108" />
          </g>
        </g>

        {/* 머리 */}
        <circle cx="125" cy="105" r="20" fill="#eac48f" />
        <circle cx="195" cy="105" r="20" fill="#eac48f" />
        <circle cx="125" cy="105" r="10" fill="#c99b5f" />
        <circle cx="195" cy="105" r="10" fill="#c99b5f" />
        <circle cx="160" cy="150" r="55" fill="#eac48f" />

        {/* 스포츠 헤어밴드 */}
        <rect x="107" y="118" width="106" height="15" rx="7.5" fill="#ffd93d" />

        {/* 얼굴 */}
        <ellipse cx="160" cy="165" rx="32" ry="24" fill="#fbefdd" />
        <ellipse cx="160" cy="153" rx="8" ry="6" fill="#3b2a1e" />
        <path
          d="M148 176c6 6 18 6 24 0"
          fill="none"
          stroke="#3b2a1e"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="138" cy="140" r="6" fill="#3b2a1e" />
        <circle cx="182" cy="140" r="6" fill="#3b2a1e" />
        <circle cx="140" cy="138" r="1.6" fill="#ffffff" />
        <circle cx="184" cy="138" r="1.6" fill="#ffffff" />
      </g>

      {/* 방금 친 테니스공 */}
      <g className="tennis-ball">
        <path
          d="M215 108c-8 4-15 9-21 15"
          fill="none"
          stroke="#c9e9d4"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 7"
        />
        <circle cx="238" cy="58" r="13" fill="#ffd93d" />
        <path
          d="M228 52c4 4 4 10 0 14M248 52c-4 4-4 10 0 14"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
