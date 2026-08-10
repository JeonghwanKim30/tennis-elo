import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/notice";

// 카카오 로그인(OAuth) 콜백 — 프로필 페이지의 "카카오톡 계정 연동하기" 버튼에서
// 시작된 인가 코드(code)를 액세스 토큰으로 교환하고, 카카오 프로필의 id를
// 현재 로그인된(우리 서비스 PIN 로그인) 유저에게 연동한다. 새로 로그인하는
// 수단이 아니라 "계정 연동"이라 시작 전에 이미 세션이 있어야 한다.
//
// 동작하려면 카카오 디벨로퍼스에서 발급받은 KAKAO_REST_API_KEY(필수),
// KAKAO_CLIENT_SECRET(카카오 앱에서 켰다면), KAKAO_REDIRECT_URI(이 라우트의
// 절대 주소, 카카오 앱에 등록된 값과 정확히 일치해야 함)를 환경변수로 채워야
// 한다 — 안 채워져 있으면 프로필 페이지의 연동 버튼 자체가 비활성 상태로 뜬다.
export async function GET(req: NextRequest) {
  const base = appBaseUrl();
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.redirect(`${base}/login`);
  }

  const restApiKey = process.env.KAKAO_REST_API_KEY;
  if (!restApiKey) {
    return NextResponse.redirect(`${base}/profile?kakao=not_configured`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError || !code) {
    return NextResponse.redirect(`${base}/profile?kakao=cancelled`);
  }

  const redirectUri = process.env.KAKAO_REDIRECT_URI ?? `${base}/api/kakao/callback`;

  try {
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: restApiKey,
        ...(process.env.KAKAO_CLIENT_SECRET ? { client_secret: process.env.KAKAO_CLIENT_SECRET } : {}),
        redirect_uri: redirectUri,
        code,
      }),
    });
    if (!tokenRes.ok) throw new Error(`token exchange failed: ${tokenRes.status}`);
    const tokenJson: { access_token: string } = await tokenRes.json();

    const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!profileRes.ok) throw new Error(`profile fetch failed: ${profileRes.status}`);
    const profileJson: { id: number | string; kakao_account?: { profile?: { nickname?: string } } } =
      await profileRes.json();

    const kakaoId = String(profileJson.id);
    const nickname = profileJson.kakao_account?.profile?.nickname ?? null;

    // 이미 다른 우리 서비스 계정이 이 카카오 계정을 연동해뒀다면 덮어쓰지 않는다.
    const existing = await prisma.user.findUnique({ where: { kakaoId } });
    if (existing && existing.id !== session.userId) {
      return NextResponse.redirect(`${base}/profile?kakao=already_linked`);
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        kakaoId,
        kakaoNickname: nickname,
        kakaoConnectedAt: new Date(),
        // 카카오 인가 화면에서 수신 동의 항목까지 함께 동의를 받았다는 전제로
        // 연동 완료 시 기본 ON — 이후 프로필 토글로 언제든 끌 수 있다.
        kakaoNotifyOptIn: true,
      },
    });

    return NextResponse.redirect(`${base}/profile?kakao=connected`);
  } catch {
    return NextResponse.redirect(`${base}/profile?kakao=error`);
  }
}
