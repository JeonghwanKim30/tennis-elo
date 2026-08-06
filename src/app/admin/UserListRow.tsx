import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { formatPhone } from "@/lib/phone";

// "가입 승인"과 "유저 관리" 두 탭이 같은 카드 스타일(프로필 사진 + 이름 + 전화번호)을
// 쓰도록 공유하는 한 줄짜리 프레젠테이션 컴포넌트. 우측 버튼 영역만 탭마다 다르다.
export function UserListRow({
  avatarSrc,
  name,
  phone,
  badges,
  actions,
  removing,
  profileHref,
}: {
  avatarSrc: string;
  name: string;
  phone: string;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  removing: boolean;
  /** 넘기면 프로필 사진+이름 영역이 해당 유저의 공개 프로필로 가는 링크가 된다.
   *  승인 대기(PENDING) 유저는 아직 공개 프로필이 없으므로 가입 승인 탭에서는 넘기지 않는다. */
  profileHref?: string;
}) {
  const identity = (
    <>
      <Avatar src={avatarSrc} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-medium">{name}</span>
          {badges}
        </div>
        <p className="truncate text-sm text-muted-foreground">{formatPhone(phone)}</p>
      </div>
    </>
  );

  return (
    <div
      className={`flex flex-wrap items-center gap-3 px-4 py-3 transition-all duration-200 ease-out ${
        removing ? "-translate-x-2 opacity-0" : "opacity-100"
      }`}
    >
      {profileHref ? (
        <Link href={profileHref} className="btn-press flex min-w-0 flex-1 items-center gap-3">
          {identity}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{identity}</div>
      )}
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
