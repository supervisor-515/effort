// 의존성 없이 PWA 아이콘 PNG를 생성한다.
// 종이색 배경 위에 올리브/클레이 막대가 쌓이는 심볼(프로토타입 모티프).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const BG = hex('#E9E2D4');
const CARD = hex('#FBF8F1');
const OLIVE = hex('#6F7252');
const CLAY = hex('#C07B53');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // rest 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function draw(size, maskable) {
  const buf = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b], a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  };
  const fillRect = (x0, y0, w, h, color, radius = 0) => {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (radius > 0) {
          const dxL = x - (x0 + radius), dxR = x - (x0 + w - 1 - radius);
          const dyT = y - (y0 + radius), dyB = y - (y0 + h - 1 - radius);
          let dx = 0, dy = 0;
          if (x < x0 + radius) dx = dxL; else if (x > x0 + w - 1 - radius) dx = dxR;
          if (y < y0 + radius) dy = dyT; else if (y > y0 + h - 1 - radius) dy = dyB;
          if (dx * dx + dy * dy > radius * radius) continue;
        }
        set(x, y, color);
      }
    }
  };

  // 전체 배경
  fillRect(0, 0, size, size, BG);

  // maskable 은 안전영역(약 80%)에 맞춰 내부 패딩을 더 준다.
  const pad = maskable ? Math.round(size * 0.16) : Math.round(size * 0.1);
  const inner = size - pad * 2;
  const r = Math.round(inner * 0.22);
  // 카드(살짝 밝은 라운드 사각형)
  fillRect(pad, pad, inner, inner, CARD, r);

  // 막대 3개가 차오르는 심볼
  const barAreaX = pad + Math.round(inner * 0.2);
  const barAreaW = Math.round(inner * 0.6);
  const gap = Math.round(barAreaW * 0.12);
  const barW = Math.round((barAreaW - gap * 2) / 3);
  const baseY = pad + Math.round(inner * 0.78);
  const heights = [0.26, 0.44, 0.6].map((f) => Math.round(inner * f));
  const colors = [OLIVE, CLAY, OLIVE];
  for (let i = 0; i < 3; i++) {
    const x = barAreaX + i * (barW + gap);
    const hgt = heights[i];
    const br = Math.round(barW * 0.32);
    fillRect(x, baseY - hgt, barW, hgt, colors[i], br);
    // 막대 상단에 클레이 강조 캡(버텨낸 노력 모티프)
    const capH = Math.round(hgt * 0.28);
    fillRect(x, baseY - hgt, barW, capH, i === 1 ? OLIVE : CLAY, br);
  }
  return encodePng(size, size, buf);
}

writeFileSync(join(outDir, 'icon-192.png'), draw(192, false));
writeFileSync(join(outDir, 'icon-512.png'), draw(512, false));
writeFileSync(join(outDir, 'icon-512-maskable.png'), draw(512, true));
// apple-touch-icon (180) — public 루트
writeFileSync(join(__dirname, '..', 'public', 'apple-touch-icon.png'), draw(180, false));

console.log('icons generated → public/icons/');
