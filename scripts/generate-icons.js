// Run once: node scripts/generate-icons.js
// Generates PWA icons: 192x192, 512x512, 180x180 (apple-touch-icon)
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const outDir = path.join(__dirname, "../public/icons");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const NAVY = "#1e3a5f";

async function makeIcon(size, outFile) {
  // Draw navy circle background with white Arabic "م" text using SVG
  const fontSize = Math.round(size * 0.52);
  const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="${NAVY}"/>
  <text
    x="50%" y="54%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="'Segoe UI', Tahoma, Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="900"
    fill="white"
  >م</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(outFile);
  console.log(`✓ ${outFile}`);
}

async function main() {
  await makeIcon(192, path.join(outDir, "icon-192.png"));
  await makeIcon(512, path.join(outDir, "icon-512.png"));
  await makeIcon(180, path.join(outDir, "apple-touch-icon.png"));
  console.log("Done!");
}

main().catch(console.error);
