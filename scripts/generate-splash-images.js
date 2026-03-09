/**
 * Generates splash screen images from the AEGIS logo.
 * 1. Creates splash.png (1024x1024) for app.json / prebuild
 * 2. Creates 1x, 2x, 3x variants for iOS SplashScreenLogo.imageset
 * Logo centered on pure black (#000000) background.
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const INPUT = path.join(__dirname, '../assets/images/icons/aegis.png');
const SPLASH_SOURCE = path.join(__dirname, '../assets/images/icons/splash.png');
const OUTPUT_DIR = path.join(__dirname, '../ios/AEGIS/Images.xcassets/SplashScreenLogo.imageset');

const SIZES = {
  'image.png': 414,
  'image@2x.png': 828,
  'image@3x.png': 1242,
};

async function createSplashSource() {
  const meta = await sharp(INPUT).metadata();
  const logoAspect = meta.width / meta.height;
  const size = 1024;
  const logoSize = Math.round(size * 0.7);
  const logoW = logoSize;
  const logoH = Math.round(logoSize / logoAspect);
  const left = Math.floor((size - logoW) / 2);
  const top = Math.floor((size - logoH) / 2);

  const resizedLogo = await sharp(INPUT)
    .resize(logoW, logoH, { fit: 'contain' })
    .toBuffer();

  const result = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .composite([{ input: resizedLogo, left, top }])
    .png()
    .toBuffer();

  fs.writeFileSync(SPLASH_SOURCE, result);
  console.log('Created: assets/images/icons/splash.png (1024x1024)');
}

async function main() {
  await createSplashSource();

  const meta = await sharp(INPUT).metadata();
  const logoAspect = meta.width / meta.height;

  for (const [filename, width] of Object.entries(SIZES)) {
    const height = Math.round(width * (736 / 414));
    const logoWidth = Math.round(Math.min(width * 0.8, height * 0.65 * logoAspect));
    const logoHeight = Math.round(logoWidth / logoAspect);

    const resizedLogo = await sharp(INPUT)
      .resize(logoWidth, logoHeight, { fit: 'contain' })
      .toBuffer();

    const left = Math.floor((width - logoWidth) / 2);
    const top = Math.floor((height - logoHeight) / 2);

    const result = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    })
      .composite([{ input: resizedLogo, left, top }])
      .png()
      .toBuffer();

    const outPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(outPath, result);
    console.log('Created:', filename, `${width}x${height}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
