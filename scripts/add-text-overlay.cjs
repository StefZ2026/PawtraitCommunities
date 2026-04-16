const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "client", "public", "images", "styles");

async function addTextOverlay(inputFile, text) {
  const outputFile = inputFile + ".tmp";
  const meta = await sharp(inputFile).metadata();
  const w = meta.width || 1024;
  const h = meta.height || 1024;

  const bannerH = Math.round(h * 0.1);
  const fontSize = Math.round(bannerH * 0.5);

  const svg = `<svg width="${w}" height="${h}">
    <rect x="0" y="0" width="${w}" height="${bannerH}" fill="rgba(255,255,255,0.85)" rx="0"/>
    <text x="${w / 2}" y="${bannerH * 0.68}" text-anchor="middle"
      font-family="Georgia, serif" font-size="${fontSize}" font-weight="bold" fill="#E8751E">
      ${text}
    </text>
  </svg>`;

  await sharp(inputFile)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toFile(outputFile);

  fs.renameSync(outputFile, inputFile);
  console.log(`  Overlay added: ${path.basename(inputFile)}`);
}

(async () => {
  const dogFile = path.join(dir, "mothers-day.jpg");
  const catFile = path.join(dir, "mothers-day-cat.jpg");

  if (fs.existsSync(dogFile)) await addTextOverlay(dogFile, "Happy Mother&#39;s Day");
  if (fs.existsSync(catFile)) await addTextOverlay(catFile, "Happy Mother&#39;s Day");

  console.log("Done!");
})().catch((e) => console.error("Error:", e.message));
