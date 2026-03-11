/**
 * Copies assets/images/icons/splash.png to iOS SplashScreenLogo.imageset.
 * Uses your existing splash.png — does not overwrite it.
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SPLASH_SOURCE = path.join(__dirname, '../assets/images/icons/splash.png');
const OUTPUT_DIR = path.join(__dirname, '../ios/AEGIS/Images.xcassets/SplashScreenLogo.imageset');

const SIZES = {
  'image.png': 414,
  'image@2x.png': 828,
  'image@3x.png': 1242,
};

async function main() {
  if (!fs.existsSync(SPLASH_SOURCE)) {
    console.error('Missing:', SPLASH_SOURCE);
    process.exit(1);
  }

  const meta = await sharp(SPLASH_SOURCE).metadata();
  const aspect = meta.width / meta.height;

  for (const [filename, width] of Object.entries(SIZES)) {
    const height = Math.round(width * (736 / 414));
    const w = Math.min(width, Math.round(height * aspect));
    const h = Math.round(w / aspect);
    const left = Math.floor((width - w) / 2);
    const top = Math.floor((height - h) / 2);

    const resized = await sharp(SPLASH_SOURCE)
      .resize(w, h, { fit: 'contain' })
      .toBuffer();

    const result = await sharp({
      create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
    })
      .composite([{ input: resized, left, top }])
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(OUTPUT_DIR, filename), result);
    console.log('Created:', filename);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
