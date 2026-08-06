"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { bioSchema, phoneSchema } from "@/lib/validation";
import { lastFourDigits } from "@/lib/phone";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export interface ProfileImageState {
  error?: string;
}

export async function updateProfileImageAction(dataUrl: string): Promise<ProfileImageState> {
  const user = await requireUser();

  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return { error: "이미지 형식이 올바르지 않습니다." };
  }
  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    return { error: "이미지 용량이 너무 큽니다." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { profileImage: buffer, profileImageType: mimeType },
  });

  revalidatePath("/profile");
  return {};
}

export interface BioState {
  error?: string;
}

export async function updateBioAction(bio: string): Promise<BioState> {
  const user = await requireUser();

  const parsed = bioSchema.safeParse(bio);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "자기소개를 확인해주세요." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { bio: parsed.data || null },
  });

  revalidatePath("/profile");
  revalidatePath(`/profile/${user.id}`);
  return {};
}

export interface PhoneState {
  error?: string;
  success?: boolean;
  phone?: string;
}

/**
 * 전화번호를 바꾸면 로그인 PIN(휴대폰 뒷자리 4자리)도 그 번호 기준으로
 * 자동으로 다시 계산해 함께 갱신한다 — 사용자가 PIN을 따로 재설정할
 * 필요가 없다.
 */
export async function updatePhoneAction(
  _prevState: PhoneState,
  formData: FormData
): Promise<PhoneState> {
  const user = await requireUser();

  const parsed = phoneSchema.safeParse(formData.get("phone"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "전화번호를 확인해주세요." };
  }
  const phone = parsed.data;

  if (phone !== user.phone) {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return { error: "이미 등록된 휴대폰 번호입니다." };
    }
  }

  const pin = lastFourDigits(phone);
  const pinHash = await bcrypt.hash(pin, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { phone, pinHash },
  });

  revalidatePath("/profile");
  return { success: true, phone };
}
