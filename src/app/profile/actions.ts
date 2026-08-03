"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

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
