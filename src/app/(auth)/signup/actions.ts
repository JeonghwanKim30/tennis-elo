"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validation";
import { lastFourDigits } from "@/lib/phone";

export interface SignupState {
  error?: string;
  success?: boolean;
}

export async function signupAction(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    gender: formData.get("gender"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const { name, phone, gender } = parsed.data;

  // 거절(REJECTED)된 신청은 DB에서 완전히 삭제되고, 추방(BANNED)된 회원은
  // 전화번호가 마스킹되어 실제 번호를 더 이상 붙들고 있지 않다(각각
  // rejectUserAction/banUserAction 참고) — 그래도 혹시 모를 예외 상황에
  // 대비해 조회 자체도 ACTIVE/PENDING 상태만 "이미 등록됨"으로 취급한다.
  const existing = await prisma.user.findFirst({
    where: { phone, status: { in: ["ACTIVE", "PENDING"] } },
  });
  if (existing) {
    return { error: "이미 등록된 휴대폰 번호입니다." };
  }

  const pin = lastFourDigits(phone);
  const pinHash = await bcrypt.hash(pin, 10);

  await prisma.user.create({
    data: { name, phone, gender, pinHash },
  });

  return { success: true };
}
