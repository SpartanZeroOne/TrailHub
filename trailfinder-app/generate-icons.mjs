import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC    = resolve(__dirname, '..', 'App Icon.png');
const OUT    = resolve(__dirname, 'public', 'icons');
const PUBLIC = resolve(__dirname, 'public');
const NETLIFY = resolve(__dirname, 'netlify');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const ICONS = [
  { dest: resolve(OUT, 'favicon-16x16.png'),     size: 16  },
  { dest: resolve(OUT, 'favicon-32x32.png'),     size: 32  },
  { dest: resolve(OUT, 'apple-touch-icon.png'),  size: 180 },
  { dest: resolve(OUT, 'icon-192.png'),          size: 192 },
  { dest: resolve(OUT, 'icon-512.png'),          size: 512 },
  { dest: resolve(OUT, 'icon-maskable-512.png'), size: 512 },
  { dest: resolve(PUBLIC, 'favicon.png'),        size: 32  },
  { dest: resolve(NETLIFY, 'icon-192.png'),      size: 192 },
];

console.log('Source:', SRC, '\n');
for (const { dest, size } of ICONS) {
  await sharp(SRC).resize(size, size).png({ quality: 100 }).toFile(dest);
  const label = dest.split(/[\\/]/).slice(-2).join('/').padEnd(38);
  console.log(`✓  ${label} ${size}×${size}px`);
}
console.log('\nDone — all icons generated from App Icon.png');