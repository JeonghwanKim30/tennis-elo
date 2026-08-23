import { cache } from "react";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { prisma } from "@/lib/prisma";

export interface SessionData {
  userId?: string;
  role?: "USER" | "ADMIN";
}

const password = process.env.SESSION_SECRET;
if (!password || password.length < 32) {
  throw new Error("SESSION_SECRET must be set to a string of at least 32 characters");
}

export const sessionOptions: SessionOptions = {
  password,
  cookieName: "tennis_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

// 루트 레이아웃(모든 페이지 공통)의 NavBar가 라우팅마다 이걸 불러 로그인
// 여부/역할만 확인한다 — React cache()로 감싸 같은 요청 안에서는 최초 1번만
// DB를 조회하고 재사용한다(요청이 끝나면 캐시도 함께 사라지므로 로그인
// 상태가 오래된 값으로 굳어버릴 걱정은 없다).
// select를 인증/권한 판단에 실제로 쓰이는 최소 컬럼으로 좁혀둔 것도 중요하다
// — 예전엔 select 없이 전체 컬럼(특히 profileImage Bytes, 프로필 사진)을
// 끌어왔는데, 그러면 이 앱의 "모든" 페이지 전환마다(로그인 여부 확인을
// NavBar가 매번 하므로) 사진 바이트를 통째로 다시 읽어왔다 — 실제로 사진이
// 필요한 곳(/profile)만 별도 쿼리로 가져오게 분리했다(profile/page.tsx 참고).
export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, phone: true, role: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") return null;

  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("관리자 권한이 필요합니다.");
  return user;
}
