/**
 * Generates a white-only transparent notification icon from the AEGIS logo.
 * Converts amber/colored pixels to white, black/dark pixels to transparent.
 */
const sharp = require('sharp');
const path = require('path');

const INPUT = path.join(__dirname, '../assets/images/icons/aegis.png');
const OUTPUT = path.join(__dirname, '../assets/images/icons/notification-icon.png');

const LUMINANCE_THRESHOLD = 60; // Pixels darker than this become transparent

async function main() {
  const { data, info } = await sharp(INPUT)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixels = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3] ?? 255;

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    if (luminance < LUMINANCE_THRESHOLD || a < 25) {
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = 0;
    } else {
      pixels[i] = 255;
      pixels[i + 1] = 255;
      pixels[i + 2] = 255;
      pixels[i + 3] = 255;
    }
  }

  await sharp(pixels, { raw: { width, height, channels } })
    .png()
    .toFile(OUTPUT);

  console.log('Created:', OUTPUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
