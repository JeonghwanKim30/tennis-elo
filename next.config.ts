import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 클라이언트 라우터 캐시 보존 시간(초) — SWR의 staleTime과 같은 개념이다.
    // 이 앱은 전부 동적 렌더링(쿠키 세션)이라 기본값(dynamic: 0)으로는 같은
    // 페이지를 다시 방문해도 매번 새로 서버를 왕복한다. static(=prefetch=true로
    // 미리 받아둔 페이지) 값을 늘려두면, 하단 탭/뒤로가기로 이미 열어본 화면은
    // 캐시에서 즉시 그려주고 백그라운드에서 최신 데이터로 조용히 교체한다.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
