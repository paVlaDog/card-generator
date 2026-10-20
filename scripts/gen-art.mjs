import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const W = 900;
const H = 680;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "assets", "arcane");

const INK = "#241c16";
const CREAM = "#f3ecdf";
const RED = "#8e2f2a";
const GOLD = "#b8893d";
const GREEN = "#1f3d34";
const BLUE = "#24324a";
const PAPER = "#e7dcc8";

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
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function save(name, canvas) {
  fs.writeFileSync(path.join(outDir, name), encode(canvas.px));
}

function vial() {
  const g = create(PAPER);
  g.rect(418, 150, 64, 70, CREAM);
  g.rect(400, 130, 100, 28, GOLD);
  g.poly([[330, 250], [570, 250], [610, 560], [290, 560]], GREEN);
  g.poly([[348, 360], [552, 360], [590, 540], [310, 540]], RED);
  g.ellipse(450, 470, 90, 28, "#6e221f");
  g.rect(430, 188, 14, 80, "#f7f3ea");
  return g;
}

function book() {
  const g = create("#efe4cf");
  g.poly([[120, 180], [450, 140], [450, 540], [120, 520]], CREAM);
  g.poly([[780, 180], [450, 140], [450, 540], [780, 520]], "#e7d3b4");
  g.rect(438, 140, 24, 400, INK);
  g.circle(450, 330, 54, CREAM);
  g.ellipse(450, 330, 28, 16, RED);
  g.circle(450, 330, 8, INK);
  g.rect(180, 230, 180, 8, GOLD);
  g.rect(180, 260, 140, 8, GOLD);
  g.rect(520, 230, 180, 8, GOLD);
  g.rect(560, 260, 140, 8, GOLD);
  return g;
}

function key() {
  const g = create(PAPER);
  g.circle(300, 300, 120, GOLD);
  g.circle(300, 300, 58, PAPER);
  g.rect(400, 274, 340, 52, GOLD);
  g.rect(640, 326, 28, 70, GOLD);
  g.rect(700, 326, 28, 46, GOLD);
  g.circle(300, 300, 16, INK);
  return g;
}

function tower() {
  const g = create("#d5deea");
  g.circle(680, 160, 70, CREAM);
  g.circle(720, 150, 58, "#d5deea");
  g.rect(250, 230, 220, 360, BLUE);
  g.rect(230, 210, 260, 36, INK);
  for (let i = 0; i < 5; i += 1) g.rect(236 + i * 52, 160, 36, 52, INK);
  g.rect(330, 300, 48, 64, GOLD);
  g.rect(330, 420, 48, 64, GOLD);
  g.rect(318, 500, 80, 90, INK);
  return g;
}

function knife() {
  const g = create(PAPER);
  g.poly([[470, 70], [520, 90], [430, 430], [390, 410]], CREAM);
  g.poly([[470, 70], [500, 86], [418, 420], [398, 404]], "#f7f3ea");
  g.rect(300, 400, 250, 28, GOLD);
  g.rect(392, 428, 56, 170, INK);
  g.rect(404, 440, 12, 140, GOLD);
  return g;
}

function eye() {
  const g = create("#efe6d4");
  g.poly([[450, 70], [760, 560], [140, 560]], INK);
  g.poly([[450, 130], [700, 530], [200, 530]], PAPER);
  g.ellipse(450, 360, 170, 80, CREAM);
  g.circle(450, 360, 58, GREEN);
  g.circle(450, 360, 24, INK);
  g.circle(468, 344, 8, CREAM);
  return g;
}

fs.mkdirSync(outDir, { recursive: true });
save("vial.png", vial());
save("book.png", book());
save("key.png", key());
save("tower.png", tower());
save("knife.png", knife());
save("eye.png", eye());
console.log("art ok");
