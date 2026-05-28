import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, "..", "public");

// Tennis-ball yellow J on a soft gradient — matches the in-app brand mark.
const ICON_SVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e5ff61" />
      <stop offset="100%" stop-color="#b9e02a" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)" />
  <rect x="6" y="6" width="500" height="500" rx="106" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="2" />
  <text
    x="256" y="356"
    text-anchor="middle"
    font-family="'DM Sans', system-ui, sans-serif"
    font-weight="800"
    font-size="360"
    letter-spacing="-12"
    fill="#0a0a0a"
  >J</text>
</svg>`;

// Maskable: full-bleed, J safely inside the safe-area circle (~40% radius)
const MASKABLE_SVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e5ff61" />
      <stop offset="100%" stop-color="#b9e02a" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg2)" />
  <text
    x="256" y="332"
    text-anchor="middle"
    font-family="'DM Sans', system-ui, sans-serif"
    font-weight="800"
    font-size="240"
    letter-spacing="-8"
    fill="#0a0a0a"
  >J</text>
</svg>`;

const FAVICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e5ff61" />
      <stop offset="100%" stop-color="#b9e02a" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#bg)" />
  <text
    x="32" y="46"
    text-anchor="middle"
    font-family="'DM Sans', system-ui, sans-serif"
    font-weight="800"
    font-size="46"
    letter-spacing="-1.5"
    fill="#0a0a0a"
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
await rasterize(ICON_SVG(180), resolve(PUBLIC_DIR, "apple-touch-icon.png"), 180);

await writeFile(resolve(PUBLIC_DIR, "favicon.svg"), FAVICON_SVG.trim());
console.log("wrote favicon.svg");
