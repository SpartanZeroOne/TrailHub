const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SOURCE = 'C:/Users/Thor/Documents/local_ai/TRAILFINDER/App ions/Neuer Ordner/android/mipmap-xxxhdpi/test.png';

const DENSITIES = {
  'mipmap-mdpi':    108,
  'mipmap-hdpi':    162,
  'mipmap-xhdpi':   216,
  'mipmap-xxhdpi':  324,
  'mipmap-xxxhdpi': 432,
};

const DEST_BASE = 'C:/Users/Thor/Documents/local_ai/TRAILFINDER/trailfinder-app/android/app/src/main/res';

const src = PNG.sync.read(fs.readFileSync(SOURCE));
const SW = src.width, SH = src.height;

// Step 1: find the center of mass of all white pixels in the source
// This gives us the true visual center of the map symbol
let totalW = 0, sumX = 0, sumY = 0;
for (let y = 0; y < SH; y++) {
  for (let x = 0; x < SW; x++) {
    const i = (y * SW + x) * 4;
    const r = src.data[i], g = src.data[i+1], b = src.data[i+2], a = src.data[i+3];
    const w = (Math.min(r, g, b) / 255) * (a / 255);
    if (w > 0.1) { sumX += x * w; sumY += y * w; totalW += w; }
  }
}
const symCX = sumX / totalW;  // visual center X of symbol in source
const symCY = sumY / totalW;  // visual center Y of symbol in source
console.log(`Source: ${SW}x${SH}, symbol visual center: (${symCX.toFixed(1)}, ${symCY.toFixed(1)}), source center: (${SW/2}, ${SH/2})`);

for (const [density, C] of Object.entries(DENSITIES)) {
  const out = new PNG({ width: C, height: C, filterType: -1 });
  out.data.fill(0);

  // Shift amount: move the symbol center to the canvas center
  // dx/dy are in canvas-pixel units
  const scale = C / SW;
  const dx = C / 2 - symCX * scale;
  const dy = C / 2 - symCY * scale;

  for (let ty = 0; ty < C; ty++) {
    for (let tx = 0; tx < C; tx++) {
      // Reverse-map canvas pixel to source, accounting for centering shift
      const sx = (tx - dx) / scale;
      const sy = (ty - dy) / scale;

      if (sx < 0 || sx >= SW - 1 || sy < 0 || sy >= SH - 1) continue;

      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = x0 + 1, y1 = y0 + 1;
      const fx = sx - x0, fy = sy - y0;

      function s(x, y) {
        const i = (y * SW + x) * 4;
        return [src.data[i], src.data[i+1], src.data[i+2], src.data[i+3]];
      }
      const [r00,g00,b00,a00] = s(x0,y0);
      const [r10,g10,b10,a10] = s(x1,y0);
      const [r01,g01,b01,a01] = s(x0,y1);
      const [r11,g11,b11,a11] = s(x1,y1);

      const r = r00*(1-fx)*(1-fy) + r10*fx*(1-fy) + r01*(1-fx)*fy + r11*fx*fy;
      const g = g00*(1-fx)*(1-fy) + g10*fx*(1-fy) + g01*(1-fx)*fy + g11*fx*fy;
      const b = b00*(1-fx)*(1-fy) + b10*fx*(1-fy) + b01*(1-fx)*fy + b11*fx*fy;
      const a = a00*(1-fx)*(1-fy) + a10*fx*(1-fy) + a01*(1-fx)*fy + a11*fx*fy;

      const whiteness = (Math.min(r, g, b) / 255) * (a / 255);
      if (whiteness < 0.02) continue;

      const di = (ty * C + tx) * 4;
      out.data[di]   = 255;
      out.data[di+1] = 255;
      out.data[di+2] = 255;
      out.data[di+3] = Math.min(255, Math.round(whiteness * 300));
    }
  }

  const destPath = path.join(DEST_BASE, density, 'ic_launcher_foreground.png');
  fs.writeFileSync(destPath, PNG.sync.write(out));
  console.log(`${density}: ${C}x${C}, shift=(${dx.toFixed(1)}, ${dy.toFixed(1)})`);
}
console.log('Done.');
