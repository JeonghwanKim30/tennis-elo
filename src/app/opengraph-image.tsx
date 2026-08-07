import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

// 카카오톡/라인/메신저 등에서 링크 공유 시 뜨는 미리보기 이미지. Next.js 파일
// 컨벤션(app/opengraph-image.tsx)이라 별도 <meta property="og:image"> 설정 없이
// 자동으로 태그가 생성된다. 웹클립 파비콘(src/app/icon.png)과 같은 마스코트
// 이미지를 재사용해 브랜드 톤을 통일하고, 배경은 아이보리, 포인트는 브랜드
// 그린(#2fbf71)으로 맞춘다.
export const alt = "테디베어 - 테니스 전적 관리";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PRIMARY = "#2fbf71";

// process.cwd()는 실행 환경에 따라 모노레포 루트 등으로 달라질 수 있어 신뢰할
// 수 없다 — 이 파일 자신의 위치(import.meta.url) 기준 상대 경로로 찾는다.
const currentDir = dirname(fileURLToPath(import.meta.url));

export default async function OpengraphImage() {
  const iconBuffer = await readFile(join(currentDir, "icon.png"));
  const iconSrc = `data:image/png;base64,${iconBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #FBF8EF 0%, #F2ECD9 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 300,
            height: 300,
            borderRadius: 72,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(31,59,48,0.18)",
            background: "#ffffff",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iconSrc} width={300} height={300} alt="" />
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            width: 220,
            height: 8,
            borderRadius: 4,
            background: PRIMARY,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
