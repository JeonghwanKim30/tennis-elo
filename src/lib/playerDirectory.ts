import { avatarSrc, type AvatarUser } from "@/lib/avatar";
import type { TeamPlayer } from "@/components/TeamBadges";
import type { Gender } from "@/generated/prisma/client";

export interface MemberRow extends AvatarUser {
  id: string;
  name: string;
}

export interface GuestRow {
  id: string;
  name: string;
  gender: Gender;
}

/** 게스트는 프로필 사진이 없으므로 성별 기본 아바타만 쓴다. */
export function guestAvatarSrc(gender: Gender): string {
  return avatarSrc({ profileImage: null, profileImageType: null, gender });
}

/**
 * 경기 카드에서 "id -> 이름/아바타"를 해결하기 위한 조회용 맵.
 *
 * 회원과 특수 이벤트 게스트를 반드시 함께 담아야 한다. Match.teamAPlayer1 등은
 * FK가 아닌 순수 String 컬럼이라 게스트 id가 회원과 같은 자리에 들어가는데,
 * 경기 목록을 그리는 코드는 전부 "맵에서 못 찾은 선수가 있으면 그 경기를
 * 건너뛴다"(`if (!a1 || !b1) return null`)로 되어 있다. 게스트를 빠뜨리면
 * MT/대회 경기가 화면에서 조용히 사라지고, 관리자 점수 입력 목록에서도
 * 빠져서 결과를 입력할 수 없게 된다.
 */
export function buildPlayerDirectory(members: MemberRow[], guests: GuestRow[]): Map<string, TeamPlayer> {
  return new Map<string, TeamPlayer>([
    ...members.map((m) => [m.id, { id: m.id, name: m.name, avatarSrc: avatarSrc(m) }] as const),
    ...guests.map(
      (g) => [g.id, { id: g.id, name: g.name, avatarSrc: guestAvatarSrc(g.gender) }] as const
    ),
  ]);
}
