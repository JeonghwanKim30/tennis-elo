"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { getSession } from "@/lib/session";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    name: formData.get("name"),
    pin: formData.get("pin"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const { name, pin } = parsed.data;

  // 이름은 중복될 수 있으므로 동명이인 후보 중 PIN이 일치하는 계정을 찾는다.
  const candidates = await prisma.user.findMany({ where: { name } });

  let matchedUser = null;
  for (const candidate of candidates) {
    if (await bcrypt.compare(pin, candidate.pinHash)) {
      matchedUser = candidate;
      break;
    }
  }

  if (!matchedUser) {
    return { error: "이름 또는 PIN이 일치하지 않습니다." };
  }
  if (matchedUser.status === "PENDING") {
    return { error: "관리자 승인 대기 중입니다. 승인 후 로그인할 수 있습니다." };
  }
  if (matchedUser.status === "REJECTED") {
    return { error: "가입이 거절되었습니다. 관리자에게 문의해주세요." };
  }

  const session = await getSession();
  session.userId = matchedUser.id;
  session.role = matchedUser.role;
  await session.save();

  const next = formData.get("next");
  const isSafeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//");
  redirect(isSafeNext && next !== "/login" ? next : "/profile");
}
