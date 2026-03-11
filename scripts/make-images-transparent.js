/**
 * Converts icon and splash images to transparent background.
 * Makes black/dark pixels transparent, preserves logo.
 * Outputs to assets/images/icons/
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ICONS_DIR = path.join(__dirname, '../assets/images/icons');
const BG_THRESHOLD = 35; // Pixels with r,g,b all below this become transparent

async function makeTransparent(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixels = new Uint8ClampedArray(data);

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3] ?? 255;

    const isBackground = r < BG_THRESHOLD && g < BG_THRESHOLD && b < BG_THRESHOLD;

    if (isBackground || a < 25) {
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = 0;
    }
  }

  await sharp(pixels, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath);

  console.log('Created:', path.relative(ICONS_DIR, outputPath));
}

async function main() {
  const aegisPath = path.join(ICONS_DIR, 'aegis.png');
  const splashPath = path.join(ICONS_DIR, 'splash.png');

  if (!fs.existsSync(aegisPath)) {
    console.error('Missing:', aegisPath);
    process.exit(1);
  }

  await makeTransparent(aegisPath, aegisPath);
  if (fs.existsSync(splashPath)) {
    await makeTransparent(splashPath, splashPath);
  } else {
    console.log('Splash not found, skipping (run generate:splash first)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
