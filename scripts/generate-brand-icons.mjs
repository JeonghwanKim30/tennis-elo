import sharp from "sharp";

// TeddiMark(src/components/TeddiMark.tsx)와 동일한 모양 — 파비콘/PWA 아이콘은
// 웹폰트를 못 쓰므로 텍스트 없이 마크만 래스터화한다.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="#2fbf71" />
  <path d="M4 21c14 9 42 9 56 0M4 43c14-9 42-9 56 0" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" />
</svg>`;

const buf = Buffer.from(svg);
await sharp(buf).resize(460, 460).png().toFile("public/brand/teddi-logo.png");
await sharp(buf).resize(192, 192).png().toFile("public/brand/teddi-icon-192.png");
await sharp(buf).resize(512, 512).png().toFile("public/brand/teddi-icon-512.png");
console.log("brand icons regenerated");
