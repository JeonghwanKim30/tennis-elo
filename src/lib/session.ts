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

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.status !== "ACTIVE") return null;

  return user;
}

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
