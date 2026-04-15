import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, 'App Icon.png');
const OUT = resolve(__dirname, 'trailfinder-app/public/icons');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const SIZES = [
  { name: 'favicon-16x16.png',       size: 16  },
  { name: 'favicon-32x32.png',       size: 32  },
  { name: 'apple-touch-icon.png',    size: 180 },
  { name: 'icon-192.png',            size: 192 },
  { name: 'icon-512.png',            size: 512 },
  { name: 'icon-maskable-512.png',   size: 512 },
];

// Also write a root favicon.png (32px) and favicon.ico equivalent
const ROOT_SIZES = [
  { path: resolve(__dirname, 'trailfinder-app/public/favicon.png'), size: 32 },
];

console.log('Generating icons from:', SRC, '\n');

for (const { name, size } of SIZES) {
  const dest = resolve(OUT, name);
  await sharp(SRC).resize(size, size).png({ quality: 100 }).toFile(dest);
  console.log(`✓  ${name.padEnd(28)} ${size}×${size}px`);
}

for (const { path, size } of ROOT_SIZES) {
  await sharp(SRC).resize(size, size).png({ quality: 100 }).toFile(path);
  console.log(`✓  ${'favicon.png (root)'.padEnd(28)} ${size}×${size}px`);
}

// Also update the netlify folder icon
const netlifyDest = resolve(__dirname, 'trailfinder-app/netlify/icon-192.png');
await sharp(SRC).resize(192, 192).png({ quality: 100 }).toFile(netlifyDest);
console.log(`✓  ${'netlify/icon-192.png'.padEnd(28)} 192×192px`);

console.log('\nAll icons generated successfully.');