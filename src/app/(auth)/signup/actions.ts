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

  const existing = await prisma.user.findUnique({ where: { phone } });
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
