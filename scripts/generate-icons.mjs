import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, "..", "public");

// Display-serif "J" mark on warm ember radial — matches the in-app brand mark.
const ICON_SVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="0.30" cy="0.22" r="0.95">
      <stop offset="0%" stop-color="#ffb072" />
      <stop offset="55%" stop-color="#d2602a" />
      <stop offset="100%" stop-color="#3c1410" />
    </radialGradient>
    <radialGradient id="bgFlat" cx="0.30" cy="0.22" r="0.85">
      <stop offset="0%" stop-color="#f59663" />
      <stop offset="60%" stop-color="#b94a1f" />
      <stop offset="100%" stop-color="#3c1410" />
    </radialGradient>
    <filter id="grain" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.07 0"/>
      <feComposite operator="in" in2="SourceGraphic"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)" />
  <rect width="512" height="512" rx="112" filter="url(#grain)" opacity="0.45" />
  <text
    x="256" y="358"
    text-anchor="middle"
    font-family="'Instrument Serif', 'Iowan Old Style', Georgia, serif"
    font-size="380"
    font-style="italic"
    fill="#1a0c08"
    opacity="0.95"
  >J</text>
</svg>`;

// Maskable version: full-bleed background, J safely inside the safe-area circle (≈ 40% radius)
const MASKABLE_SVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg2" cx="0.30" cy="0.22" r="1.05">
      <stop offset="0%" stop-color="#ffb072" />
      <stop offset="55%" stop-color="#d2602a" />
      <stop offset="100%" stop-color="#3c1410" />
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg2)" />
  <text
    x="256" y="330"
    text-anchor="middle"
    font-family="'Instrument Serif', 'Iowan Old Style', Georgia, serif"
    font-size="260"
    font-style="italic"
    fill="#1a0c08"
    opacity="0.95"
  >J</text>
</svg>`;

const FAVICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="bg" cx="0.30" cy="0.22" r="0.95">
      <stop offset="0%" stop-color="#ffb072" />
      <stop offset="55%" stop-color="#d2602a" />
      <stop offset="100%" stop-color="#3c1410" />
    </radialGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#bg)" />
  <text
    x="32" y="46"
    text-anchor="middle"
    font-family="'Instrument Serif', 'Iowan Old Style', Georgia, serif"
    font-size="48"
    font-style="italic"
    fill="#1a0c08"
  >J</text>
</svg>`;

await mkdir(PUBLIC_DIR, { recursive: true });

async function rasterize(svg, outPath, size) {
  const buf = await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(outPath, buf);
  console.log("wrote", outPath);
}

await rasterize(ICON_SVG(192), resolve(PUBLIC_DIR, "icon-192.png"), 192);
await rasterize(ICON_SVG(512), resolve(PUBLIC_DIR, "icon-512.png"), 512);
await rasterize(
  MASKABLE_SVG(512),
  resolve(PUBLIC_DIR, "icon-512-maskable.png"),
  512,
);
await rasterize(
  ICON_SVG(180),
  resolve(PUBLIC_DIR, "apple-touch-icon.png"),
  180,
);

await writeFile(resolve(PUBLIC_DIR, "favicon.svg"), FAVICON_SVG.trim());
console.log("wrote favicon.svg");
