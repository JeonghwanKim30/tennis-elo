"use client";

import { usePathname } from "next/navigation";

const HIDDEN_PATH_PREFIXES = ["/login", "/signup"];

// NavBar 자체는 세션 조회가 필요한 async Server Component라 usePathname을 직접
// 쓸 수 없다. 대신 이 클라이언트 래퍼가 서버에서 이미 렌더링된 <NavBar />를
// children으로 받아, 인증 전용 화면(로그인/회원가입)에서는 그대로 숨긴다.
export function ConditionalNavBar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hidden = HIDDEN_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hidden) return null;
  return <>{children}</>;
}
