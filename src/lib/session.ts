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

// 루트 레이아웃(모든 페이지 공통)과 각 페이지가 각자 getCurrentUser를 부르다
// 보니 요청 하나당 동일한 유저 조회 쿼리가 2번씩 나가고 있었다 — React의
// cache()로 감싸 같은 요청 안에서는 최초 1번만 DB를 조회하고 그 결과를
// 재사용하게 한다(요청이 끝나면 캐시도 함께 사라지므로 로그인 상태가
// 오래된 값으로 굳어버릴 걱정은 없다).
export const getCurrentUser = cache(async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
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
