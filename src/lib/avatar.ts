import type { Gender } from "@/generated/prisma/client";

export interface AvatarUser {
  profileImage: Buffer | Uint8Array | null;
  profileImageType: string | null;
  gender: Gender;
}

// 사진을 등록하지 않은 사용자를 위한 기본 아바타 — 카카오톡 기본 프로필처럼
// 튀지 않는 단색 배경 + 사람 실루엣만 그린 미니멀한 SVG. 성별에 따라 톤만
// 살짝 다르게 해서 서비스 전체 색감과 자연스럽게 어울리도록 한다.
function defaultAvatarSvg(gender: Gender): string {
  const { bg, fg } = gender === "FEMALE" ? { bg: "f4e9ee", fg: "d9aab9" } : { bg: "e6f1ec", fg: "9fc4b0" };
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">` +
    `<rect width="200" height="200" fill="#${bg}"/>` +
    `<circle cx="100" cy="82" r="34" fill="#${fg}"/>` +
    `<path d="M40 190c0-49.7 26.9-90 60-90s60 40.3 60 90" fill="#${fg}"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function avatarSrc(user: AvatarUser): string {
  if (user.profileImage && user.profileImageType) {
    const base64 = Buffer.from(user.profileImage).toString("base64");
    return `data:${user.profileImageType};base64,${base64}`;
  }
  return defaultAvatarSvg(user.gender);
}
