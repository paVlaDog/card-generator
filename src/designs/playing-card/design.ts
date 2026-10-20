import type { Design, Recorder } from "../../model/types";

const CREAM = "#f6f1e6";
const INK = "#1c1915";
const RED = "#c4342d";
const BLEED = 3;
const TRIM_W = 63;
const TRIM_H = 88;

type Pip = [-1 | 0 | 1, number, boolean];

const PIPS: Record<string, Pip[]> = {
  "2": [[0, 0.14, false], [0, 0.86, true]],
  "3": [[0, 0.14, false], [0, 0.5, false], [0, 0.86, true]],
  "4": [[-1, 0.16, false], [1, 0.16, false], [-1, 0.84, true], [1, 0.84, true]],
  "5": [[-1, 0.16, false], [1, 0.16, false], [0, 0.5, false], [-1, 0.84, true], [1, 0.84, true]],
  "6": [[-1, 0.16, false], [1, 0.16, false], [-1, 0.5, false], [1, 0.5, false], [-1, 0.84, true], [1, 0.84, true]],
  "7": [[-1, 0.12, false], [1, 0.12, false], [0, 0.32, false], [-1, 0.5, false], [1, 0.5, false], [-1, 0.88, true], [1, 0.88, true]],
  "8": [[-1, 0.12, false], [1, 0.12, false], [-1, 0.34, false], [1, 0.34, false], [-1, 0.66, true], [1, 0.66, true], [-1, 0.88, true], [1, 0.88, true]],
  "9": [[-1, 0.1, false], [1, 0.1, false], [-1, 0.3, false], [1, 0.3, false], [0, 0.5, false], [-1, 0.7, true], [1, 0.7, true], [-1, 0.9, true], [1, 0.9, true]],
  "10": [[-1, 0.08, false], [1, 0.08, false], [0, 0.22, false], [-1, 0.36, false], [1, 0.36, false], [-1, 0.64, true], [1, 0.64, true], [0, 0.78, true], [-1, 0.92, true], [1, 0.92, true]],
};

const COURT = new Set(["J", "Q", "K"]);

function suitColor(suit: string): string {
  return suit === "♥" || suit === "♦" ? RED : INK;
}

function heart(cx: number, cy: number, size: number): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < 48; i += 1) {
    const t = (i / 48) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    points.push([cx + (x / 34) * size, cy + (y / 34) * size]);
  }
  return points;
}

function drawSuit(pen: Recorder, cx: number, cy: number, size: number, suit: string, color: string) {
  if (suit === "♦") {
    pen.polygon(
      [
        [cx, cy - size * 0.5],
        [cx + size * 0.36, cy],
        [cx, cy + size * 0.5],
        [cx - size * 0.36, cy],
      ],
      { fill: color },
    );
    return;
  }
  if (suit === "♥") {
    pen.polygon(heart(cx, cy + size * 0.04, size), { fill: color });
    return;
  }
  if (suit === "♠") {
    pen.polygon(heart(cx, cy - size * 0.02, size).map(([x, y]) => [cx - (x - cx), cy - (y - cy) - size * 0.08]), { fill: color });
    pen.polygon(
      [
        [cx - size * 0.08, cy + size * 0.08],
        [cx + size * 0.08, cy + size * 0.08],
        [cx + size * 0.16, cy + size * 0.46],
        [cx - size * 0.16, cy + size * 0.46],
      ],
      { fill: color },
    );
    return;
  }
  pen.circle(cx - size * 0.22, cy + size * 0.02, size * 0.22, { fill: color });
  pen.circle(cx + size * 0.22, cy + size * 0.02, size * 0.22, { fill: color });
  pen.circle(cx, cy - size * 0.24, size * 0.22, { fill: color });
  pen.polygon(
    [
      [cx - size * 0.07, cy + size * 0.12],
      [cx + size * 0.07, cy + size * 0.12],
      [cx + size * 0.15, cy + size * 0.48],
      [cx - size * 0.15, cy + size * 0.48],
    ],
    { fill: color },
  );
}

function drawCorner(pen: Recorder, x: number, y: number, rank: string, suit: string, color: string) {
  pen.text(rank, { x, y: y + 5.4, font: "serifBold", size: rank.length > 1 ? 13 : 16, color });
  drawSuit(pen, x + (rank.length > 1 ? 3.1 : 2.2), y + 9.6, 3.3, suit, color);
}

function drawFace(pen: Recorder, values: Record<string, string>) {
  const width = TRIM_W + BLEED * 2;
  const height = TRIM_H + BLEED * 2;
  pen.rect({ x: 0, y: 0, w: width, h: height }, { fill: CREAM });
  pen.rect({ x: BLEED + 2.4, y: BLEED + 2.4, w: TRIM_W - 4.8, h: TRIM_H - 4.8 }, { stroke: INK, sw: 0.28 });

  const rank = values.rank || "";
  const suit = values.suit || "♠";
  const color = suitColor(suit);
  const cx = BLEED + TRIM_W / 2;
  const cy = BLEED + TRIM_H / 2;

  drawCorner(pen, BLEED + 4, BLEED + 3.6, rank, suit, color);
  pen.save();
  pen.rotate(180, cx, cy);
  drawCorner(pen, BLEED + 4, BLEED + 3.6, rank, suit, color);
  pen.restore();

  if (values.art) {
    pen.image(values.art, { x: BLEED + 14, y: BLEED + 18, w: TRIM_W - 28, h: TRIM_H - 36 }, "contain");
    return;
  }
  if (rank === "A") {
    drawSuit(pen, cx, cy, 22, suit, color);
    return;
  }
  if (COURT.has(rank)) {
    pen.rect({ x: BLEED + 16, y: BLEED + 24, w: TRIM_W - 32, h: TRIM_H - 48 }, { stroke: color, sw: 0.4 });
    pen.rect({ x: BLEED + 17.6, y: BLEED + 25.6, w: TRIM_W - 35.2, h: TRIM_H - 51.2 }, { stroke: color, sw: 0.15 });
    pen.text(rank, { x: cx, y: cy + 2, font: "serifBold", size: 36, color, align: "center" });
    drawSuit(pen, cx, cy + 12, 8, suit, color);
    return;
  }

  const layout = PIPS[rank];
  if (!layout) {
    pen.text(rank, { x: cx, y: cy, font: "serifBold", size: 28, color, align: "center" });
    return;
  }
  const left = BLEED + 18;
  const right = BLEED + TRIM_W - 18;
  const top = BLEED + 18;
  const bottom = BLEED + TRIM_H - 18;
  for (const [px, py, invert] of layout) {
    const x = px === 0 ? cx : px < 0 ? left : right;
    const y = top + py * (bottom - top);
    if (invert) {
      pen.save();
      pen.rotate(180, x, y);
      drawSuit(pen, x, y, 6.4, suit, color);
      pen.restore();
    } else {
      drawSuit(pen, x, y, 6.4, suit, color);
    }
  }
}

function drawBack(pen: Recorder, values: Record<string, string>) {
  const width = TRIM_W + BLEED * 2;
  const height = TRIM_H + BLEED * 2;
  pen.rect({ x: 0, y: 0, w: width, h: height }, { fill: "#1b2744" });
  pen.rect({ x: 4.2, y: 4.2, w: width - 8.4, h: height - 8.4 }, { stroke: "#e2d2a8", sw: 0.55 });
  pen.rect({ x: 6.2, y: 6.2, w: width - 12.4, h: height - 12.4 }, { stroke: "#e2d2a8", sw: 0.2 });
  drawSuit(pen, width / 2, height / 2 - 6, 28, "♠", "#e2d2a8");
  pen.text(values.label || "КОЛОДА", {
    x: width / 2,
    y: height - 16,
    font: "serif",
    size: 11,
    color: "#e2d2a8",
    align: "center",
  });
}

export const playingCard: Design = {
  id: "playing-card",
  title: "Игральная карта (пример)",
  description: "Номинал и масть. Пипки собираются по номиналу, у валета, дамы и короля — вензель. Рубашка общая на колоду.",
  trim: { w: TRIM_W, h: TRIM_H },
  bleed: BLEED,
  backMode: "shared",
  fields: {
    front: [
      { id: "rank", kind: "text", name: "Номинал", required: true, maxLength: 2 },
      { id: "suit", kind: "text", name: "Масть", required: true, maxLength: 2 },
      { id: "art", kind: "image", name: "Рисунок центра", required: false },
    ],
    back: [{ id: "label", kind: "text", name: "Подпись рубашки", required: true, maxLength: 24 }],
  },
  render(face, values, pen) {
    if (face === "back") drawBack(pen, values);
    else drawFace(pen, values);
  },
};
