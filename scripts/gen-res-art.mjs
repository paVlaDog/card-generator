import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const W = 720;
const H = 620;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "assets", "res-arcana");

function rgba(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 255 };
}

function create(bg) {
  const px = Buffer.alloc(W * H * 4);
  const base = rgba(bg);
  for (let i = 0; i < W * H; i += 1) {
    px[i * 4] = base.r;
    px[i * 4 + 1] = base.g;
    px[i * 4 + 2] = base.b;
    px[i * 4 + 3] = 255;
  }
  function plot(x, y, col) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    px[i] = col.r;
    px[i + 1] = col.g;
    px[i + 2] = col.b;
    px[i + 3] = 255;
  }
  function rect(x, y, w, h, hex) {
    const col = rgba(hex);
    for (let yy = Math.floor(y); yy < y + h; yy += 1) {
      for (let xx = Math.floor(x); xx < x + w; xx += 1) plot(xx, yy, col);
    }
  }
  function circle(cx, cy, r, hex) {
    const col = rgba(hex);
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= cy + r; y += 1) {
      for (let x = Math.floor(cx - r); x <= cx + r; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) plot(x, y, col);
      }
    }
  }
  function ellipse(cx, cy, rx, ry, hex) {
    const col = rgba(hex);
    for (let y = Math.floor(cy - ry); y <= cy + ry; y += 1) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x += 1) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) plot(x, y, col);
      }
    }
  }
  function poly(points, hex) {
    const col = rgba(hex);
    let minY = H;
    let maxY = 0;
    for (const [, y] of points) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    minY = Math.max(0, Math.floor(minY));
    maxY = Math.min(H - 1, Math.ceil(maxY));
    for (let y = minY; y <= maxY; y += 1) {
      const xs = [];
      for (let i = 0; i < points.length; i += 1) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.ceil(xs[i]); x <= xs[i + 1]; x += 1) plot(x, y, col);
      }
    }
  }
  return { rect, circle, ellipse, poly, px };
}

let crcTable;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = crcTable[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encode(px) {
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y += 1) {
    raw[y * (W * 4 + 1)] = 0;
    px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function moth() {
  const g = create("#1b3148");
  g.rect(0, 430, W, 190, "#14283a");
  g.circle(560, 150, 78, "#f4edd8");
  g.circle(600, 138, 64, "#1b3148");
  for (const [x, y] of [[120, 90], [200, 160], [80, 220], [300, 80], [420, 140], [640, 260]]) {
    g.circle(x, y, 3, "#f4edd8");
  }
  g.ellipse(250, 360, 150, 70, "#d5e0ea");
  g.ellipse(470, 360, 150, 70, "#c5d2de");
  g.ellipse(250, 390, 90, 36, "#eef3f6");
  g.ellipse(470, 390, 90, 36, "#e7eef3");
  g.ellipse(360, 400, 28, 70, "#8d97a3");
  g.circle(360, 330, 16, "#5c6772");
  g.circle(354, 326, 3, "#1a140f");
  g.circle(366, 326, 3, "#1a140f");
  return g;
}

function kiln() {
  const g = create("#2c221c");
  g.rect(0, 470, W, 150, "#1c1612");
  g.poly([[180, 470], [250, 210], [470, 210], [540, 470]], "#6d6258");
  g.poly([[230, 470], [280, 250], [440, 250], [490, 470]], "#3a312c");
  g.ellipse(360, 400, 70, 90, "#e26a2c");
  g.ellipse(360, 420, 40, 55, "#f2c14a");
  g.rect(250, 180, 220, 36, "#e4c27a");
  g.rect(300, 140, 120, 48, "#8a7568");
  g.circle(360, 128, 18, "#f2c14a");
  return g;
}

function dragon() {
  const g = create("#24344a");
  g.rect(0, 0, W, 180, "#314862");
  g.circle(140, 110, 46, "#f6f0dd");
  g.ellipse(470, 360, 170, 48, "#d5e6ef");
  g.ellipse(330, 330, 80, 36, "#e7f1f6");
  g.circle(250, 300, 54, "#d5e6ef");
  g.poly([[300, 250], [470, 160], [520, 280], [340, 320]], "#f4f7f8");
  g.poly([[300, 270], [430, 190], [470, 280], [330, 310]], "#c5dbe6");
  g.circle(232, 292, 6, "#e2b431");
  g.circle(230, 291, 2, "#1a140f");
  g.ellipse(560, 400, 36, 16, "#d5e6ef");
  g.ellipse(610, 430, 24, 12, "#c5dbe6");
  return g;
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "moth.png"), encode(moth().px));
fs.writeFileSync(path.join(outDir, "kiln.png"), encode(kiln().px));
fs.writeFileSync(path.join(outDir, "dragon.png"), encode(dragon().px));
console.log("res arcana art ok");
