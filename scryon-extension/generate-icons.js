/**
 * Scryon Lens — Icon Generator
 * Run: npm install canvas && node generate-icons.js
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createCanvas } = require('canvas');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

const SIZES = [16, 32, 48, 128];
const OUT_DIR = path.join(__dirname, 'icons');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

for (const size of SIZES) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#080810';
  ctx.beginPath();
  const r = size * 0.22;
  ctx.roundRect(0, 0, size, size, r);
  ctx.fill();

  // Purple gradient star ✦
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#7B5CF0');
  grad.addColorStop(1, '#A78BFA');
  ctx.fillStyle = grad;

  const cx = size / 2;
  const cy = size / 2;
  const fontSize = size * 0.55;
  ctx.font = `bold ${fontSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦', cx, cy + fontSize * 0.05);

  const buffer = canvas.toBuffer('image/png');
  const outPath = path.join(OUT_DIR, `icon${size}.png`);
  fs.writeFileSync(outPath, buffer);
  console.log(`Created ${outPath}`);
}

console.log('Icons generated successfully.');
