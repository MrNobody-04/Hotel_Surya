const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, pixelFn) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = zlib.crc32(body);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression: Deflate
  ihdr[11] = 0; // Filter: Adaptive
  ihdr[12] = 0; // Interlace: None

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw Surya Hotel Icon with Sun motif, glowing rays and central "S"
function renderSuryaIcon(x, y, width, height, isMaskable = false) {
  // Supersample 2x2 for smooth antialiased edges
  let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
  const samples = 2;

  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = isMaskable ? width * 0.38 : width * 0.44;

  for (let sy = 0; sy < samples; sy++) {
    for (let sx = 0; sx < samples; sx++) {
      const px = x + (sx + 0.5) / samples;
      const py = y + (sy + 0.5) / samples;

      const dx = (px - cx) / maxRadius;
      const dy = (py - cy) / maxRadius;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Background color: Deep Slate / Navy (#0f172a = 15, 23, 42)
      let r = 15;
      let g = 23;
      let b = 42;
      let a = 255;

      // Outer decorative subtle ring
      if (dist >= 0.94 && dist <= 0.99) {
        // Golden accent ring
        r = 217; g = 119; b = 6; // #d97706
      }

      // Sun rays (16 radiating triangular rays between dist 0.52 and 0.88)
      if (dist >= 0.50 && dist <= 0.88) {
        const rayAngle = (angle + Math.PI) * (16 / (2 * Math.PI));
        const rayFraction = Math.abs((rayAngle % 1) - 0.5) * 2; // 0 at edges, 1 at peak
        const rayReach = 0.52 + 0.35 * rayFraction;
        if (dist <= rayReach) {
          // Warm gold gradient
          const t = (dist - 0.52) / 0.35;
          r = Math.round(245 - t * 20); // 245 -> 225
          g = Math.round(158 - t * 40); // 158 -> 118
          b = Math.round(11 + t * 5);
        }
      }

      // Sun core circle (dist <= 0.52)
      if (dist <= 0.52) {
        // Glowing radial gradient from gold to deep amber
        const t = dist / 0.52;
        r = Math.round(253 - t * 25); // #fbbf24 to #d97706
        g = Math.round(224 - t * 80);
        b = Math.round(71 - t * 65);
      }

      // Inner circular boundary ring
      if (dist >= 0.50 && dist <= 0.52) {
        r = 254; g = 243; b = 199; // #fef3c7
      }

      // Central stylized "S" monogram inside core (dist <= 0.36)
      const sxCoord = dx / 0.34;
      const syCoord = dy / 0.34;

      if (Math.abs(sxCoord) <= 1.0 && Math.abs(syCoord) <= 1.1) {
        const topDist = Math.sqrt((sxCoord - 0.05) ** 2 + (syCoord + 0.45) ** 2);
        const botDist = Math.sqrt((sxCoord + 0.05) ** 2 + (syCoord - 0.45) ** 2);
        const strokeWidth = 0.22;

        let isS = false;
        // Top loop (left side and top)
        if (syCoord <= 0.05 && topDist >= (0.45 - strokeWidth) && topDist <= (0.45 + strokeWidth)) {
          if (sxCoord <= 0.48 && (syCoord <= -0.15 || sxCoord <= 0.15)) {
            isS = true;
          }
        }
        // Bottom loop (right side and bottom)
        if (syCoord >= -0.05 && botDist >= (0.45 - strokeWidth) && botDist <= (0.45 + strokeWidth)) {
          if (sxCoord >= -0.48 && (syCoord >= 0.15 || sxCoord >= -0.15)) {
            isS = true;
          }
        }
        // Middle slant connecting bar
        if (Math.abs(syCoord) <= 0.18 && Math.abs(sxCoord + syCoord * 0.8) <= 0.22) {
          isS = true;
        }

        if (isS) {
          // Deep slate/navy monogram inside golden sun
          r = 15;
          g = 23;
          b = 42;
        }
      }

      rSum += r;
      gSum += g;
      bSum += b;
      aSum += a;
    }
  }

  const total = samples * samples;
  return [
    Math.round(rSum / total),
    Math.round(gSum / total),
    Math.round(bSum / total),
    Math.round(aSum / total),
  ];
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Generating PWA Icons in:', outDir);

// 1. 192x192 Icon
const icon192 = createPng(192, 192, (x, y, w, h) => renderSuryaIcon(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'icon-192.png'), icon192);
console.log('✅ Generated public/icons/icon-192.png (192x192)');

// 2. 512x512 Icon
const icon512 = createPng(512, 512, (x, y, w, h) => renderSuryaIcon(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), icon512);
console.log('✅ Generated public/icons/icon-512.png (512x512)');

// 3. 512x512 Maskable Icon
const iconMaskable = createPng(512, 512, (x, y, w, h) => renderSuryaIcon(x, y, w, h, true));
fs.writeFileSync(path.join(outDir, 'icon-512-maskable.png'), iconMaskable);
console.log('✅ Generated public/icons/icon-512-maskable.png (512x512 maskable)');

// 4. 180x180 Apple Touch Icon
const appleIcon = createPng(180, 180, (x, y, w, h) => renderSuryaIcon(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), appleIcon);
console.log('✅ Generated public/icons/apple-touch-icon.png (180x180)');

// 5. 32x32 Favicon
const favicon = createPng(32, 32, (x, y, w, h) => renderSuryaIcon(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'favicon-32.png'), favicon);
fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.png'), favicon);
console.log('✅ Generated public/favicon.png (32x32)');

console.log('🎉 All PWA icon assets generated successfully!');
