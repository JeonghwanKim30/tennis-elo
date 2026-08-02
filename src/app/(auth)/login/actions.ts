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
    phone: formData.get("phone"),
    pin: formData.get("pin"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const { phone, pin } = parsed.data;

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return { error: "등록되지 않은 휴대폰 번호입니다." };
  }
  if (user.status === "PENDING") {
    return { error: "관리자 승인 대기 중입니다. 승인 후 로그인할 수 있습니다." };
  }
  if (user.status === "REJECTED") {
    return { error: "가입이 거절되었습니다. 관리자에게 문의해주세요." };
  }

  const valid = await bcrypt.compare(pin, user.pinHash);
  if (!valid) {
    return { error: "PIN이 일치하지 않습니다." };
  }

  const session = await getSession();
  session.userId = user.id;
  session.role = user.role;
  await session.save();

  redirect("/profile");
}
