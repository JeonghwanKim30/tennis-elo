import type { Gender } from "@/generated/prisma/client";

export interface AvatarUser {
  profileImage: Buffer | Uint8Array | null;
  profileImageType: string | null;
  gender: Gender;
}

export function avatarSrc(user: AvatarUser): string {
  if (user.profileImage && user.profileImageType) {
    const base64 = Buffer.from(user.profileImage).toString("base64");
    return `data:${user.profileImageType};base64,${base64}`;
  }
  return user.gender === "FEMALE" ? "/brand/profile-female.png" : "/brand/profile-male.png";
}
