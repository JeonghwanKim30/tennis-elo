import sharp from "sharp";
import { writeFile } from "node:fs/promises";

// 브랜드 마크(TeddiMark, src/components/TeddiMark.tsx)와 같은 모양의 테니스공에
// 귀여운 눈/미소를 더한 마스코트 + "TEDDI.B" 워드마크를 흰 배경 위에 그린 뒤,
// 홈 화면/파비콘용 여러 크기로 래스터화한다. 텍스트는 시스템 기본 sans-serif로
// 그려서(웹폰트 의존 없이) 어떤 환경에서 생성하더라도 항상 렌더링되게 한다.
const PRIMARY = "#2fbf71";
const DARK = "#1f3b30";

// 100x100 디자인 그리드에서 좌표를 잡고, 실제 출력은 원하는 픽셀 크기로 벡터
// 그대로 래스터화한다(비율 계산 실수를 줄이기 위해 그리드를 고정). 마스코트만
// 있는 버전(파비콘처럼 아주 작게 쓰이는 곳 — 글자는 그 크기에서 읽히지 않으므로
// 생략)과, 공 + 심 라인 + 눈/미소 + "TEDDI.B" 글자가 함께 있는 버전 두 가지를
// 만든다.
function mascotSvg({ size, withText }) {
  const ballCenter = withText ? { x: 50, y: 38 } : { x: 50, y: 50 };
  const ballRadius = withText ? 26 : 42;
  // 원본 마크(TeddiMark)는 64x64 그리드에서 반지름 30짜리 원으로 그려져 있다 —
  // 그 비율을 유지한 채 원하는 반지름에 맞춰 통째로 확대/이동한다.
  const scale = ballRadius / 30;
  const tx = ballCenter.x - 32 * scale;
  const ty = ballCenter.y - 32 * scale;

  const text = withText
    ? `<text
        x="50"
        y="82"
        text-anchor="middle"
        font-family="Arial, 'Helvetica Neue', Helvetica, sans-serif"
        font-weight="800"
        font-size="15"
        letter-spacing="0.3"
        fill="${PRIMARY}"
      >TEDDI.B</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    <g transform="translate(${tx} ${ty}) scale(${scale})">
      <circle cx="32" cy="32" r="30" fill="${PRIMARY}" />
      <path
        d="M4 21c14 9 42 9 56 0M4 43c14-9 42-9 56 0"
        fill="none"
        stroke="#ffffff"
        stroke-width="3.5"
        stroke-linecap="round"
      />
      <ellipse cx="20" cy="19" rx="7" ry="4.2" fill="#ffffff" opacity="0.35" transform="rotate(-25 20 19)" />
      <circle cx="23" cy="30" r="2.6" fill="${DARK}" />
      <circle cx="41" cy="30" r="2.6" fill="${DARK}" />
      <path d="M24 38q8 7 16 0" fill="none" stroke="${DARK}" stroke-width="2.6" stroke-linecap="round" />
    </g>
    ${text}
  </svg>`;
}

async function renderPng(svg, outPath) {
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log("wrote", outPath);
}

// 최신 브라우저는 .ico 안에 PNG를 그대로 담는 방식(PNG-in-ICO)을 지원한다 —
// 별도의 BMP 변환 라이브러리 없이도 표준을 만족하는 favicon.ico를 만들 수 있다.
async function buildIco(pngBuffers, outPath) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  let offset = headerSize;
  const chunks = [header];
  for (let i = 0; i < count; i++) {
    const { size, buf } = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buf.length, 8); // image data size
    entry.writeUInt32LE(offset, 12); // offset
    header.set(entry, 6 + i * 16);
    chunks.push(buf);
    offset += buf.length;
  }
  await writeFile(outPath, Buffer.concat(chunks));
  console.log("wrote", outPath);
}

// 1) Next.js 파일 컨벤션 아이콘 — src/app/icon.png, src/app/apple-icon.png
//    (별도 코드 없이 Next가 자동으로 <link rel="icon"/apple-touch-icon">을 만들어준다)
await renderPng(mascotSvg({ size: 512, withText: true }), "src/app/icon.png");
await renderPng(mascotSvg({ size: 180, withText: true }), "src/app/apple-icon.png");

// 2) public/apple-touch-icon.png — Safari가 <link> 태그 없이도 사이트 루트에서
//    직접 찾는 관례 경로라 별도로 하나 더 둔다(내용은 apple-icon.png와 동일).
await renderPng(mascotSvg({ size: 180, withText: true }), "public/apple-touch-icon.png");

// 3) 안드로이드 홈 화면(manifest.json)용 아이콘 — 같은 디자인으로 재생성.
await renderPng(mascotSvg({ size: 192, withText: true }), "public/brand/teddi-icon-192.png");
await renderPng(mascotSvg({ size: 512, withText: true }), "public/brand/teddi-icon-512.png");
await renderPng(mascotSvg({ size: 460, withText: true }), "public/brand/teddi-logo.png");

// 4) favicon.ico — 16/32/48px는 텍스트가 읽히지 않으므로 마스코트만 담는다.
const icoSizes = [16, 32, 48];
const icoBuffers = await Promise.all(
  icoSizes.map(async (size) => ({
    size,
    buf: await sharp(Buffer.from(mascotSvg({ size, withText: false }))).png().toBuffer(),
  }))
);
await buildIco(icoBuffers, "src/app/favicon.ico");

console.log("brand icons regenerated");
