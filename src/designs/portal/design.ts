import type { Recorder } from "../../model/types";
import type { Design } from "../../model/types";

const GROUND = "#12080c";
const SILVER = "#d5dbe4";
const BLOOD = "#8e1c28";
const BONE = "#efeae2";
const JAW = "#e4ddd2";
const INK = "#14080c";
const VIOLET = "#c084fc";
const PAPER = "#f4f6f8";
const BODY = "#f0e4e0";
const BLEED = 3;
const TRIM_W = 63;
const TRIM_H = 88;

type Pt = [number, number];

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps = 14): Pt[] {
  const points: Pt[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    points.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return points;
}

function trace(d: string): Pt[] {
  const tokens = d.match(/[MC]|-?\d*\.?\d+/g) ?? [];
  const points: Pt[] = [];
  let index = 0;
  let x = 0;
  let y = 0;
  while (index < tokens.length) {
    const command = tokens[index];
    index += 1;
    if (command === "M") {
      x = Number(tokens[index]);
      y = Number(tokens[index + 1]);
      index += 2;
      points.push([x, y]);
      continue;
    }
    const nums: number[] = [];
    while (index < tokens.length && tokens[index] !== "M" && tokens[index] !== "C") {
      nums.push(Number(tokens[index]));
      index += 1;
    }
    for (let cursor = 0; cursor < nums.length; cursor += 6) {
      const next: Pt = [nums[cursor + 4], nums[cursor + 5]];
      const segment = cubic([x, y], [nums[cursor], nums[cursor + 1]], [nums[cursor + 2], nums[cursor + 3]], next);
      points.push(...segment.slice(1));
      x = next[0];
      y = next[1];
    }
  }
  return points;
}

function mm(x: number, y: number): Pt {
  return [BLEED + x * 0.1, BLEED + y * 0.1];
}

function stroke(pen: Recorder, points: Pt[], sw = 0.18) {
  pen.polyline(points, { stroke: SILVER, sw });
}

const CORNER = "M2 34 C2 12 20 2 34 10 C44 16 40 32 26 32 C14 32 14 18 26 16";

function corner(pen: Recorder, ox: number, oy: number, sx: number, sy: number) {
  stroke(
    pen,
    trace(CORNER).map(([x, y]) => mm(ox + sx * x, oy + sy * y)),
    0.17,
  );
}

function diamonds(pen: Recorder) {
  for (const x of [30, 600]) {
    const [cx, cy] = mm(x, 428);
    pen.polygon(
      [
        [cx, cy - 0.8],
        [cx + 0.8, cy],
        [cx, cy + 0.8],
        [cx - 0.8, cy],
      ],
      { fill: SILVER },
    );
  }
}

function skull(pen: Recorder, cx: number, cy: number, scale = 1) {
  pen.circle(cx, cy, 2.15 * scale, { fill: BONE });
  pen.polygon(
    [
      [cx - 1.45 * scale, cy + 1.15 * scale],
      [cx - 1.15 * scale, cy + 2.45 * scale],
      [cx, cy + 2.75 * scale],
      [cx + 1.15 * scale, cy + 2.45 * scale],
      [cx + 1.45 * scale, cy + 1.15 * scale],
    ],
    { fill: JAW },
  );
  for (const side of [-1, 1]) {
    pen.circle(cx + side * 0.72 * scale, cy - 0.15 * scale, 0.46 * scale, { fill: INK });
    pen.circle(cx + side * 0.72 * scale, cy - 0.18 * scale, 0.18 * scale, { fill: VIOLET });
  }
  pen.polygon(
    [
      [cx - 0.22 * scale, cy + 0.55 * scale],
      [cx, cy + 1.05 * scale],
      [cx + 0.22 * scale, cy + 0.55 * scale],
    ],
    { fill: INK },
  );
  for (const tooth of [-1.15, -0.4, 0.4, 1.15]) {
    pen.rect(
      { x: cx + tooth * scale - 0.09 * scale, y: cy + 1.55 * scale, w: 0.18 * scale, h: 0.55 * scale },
      { fill: INK },
    );
  }
}

function ornament(pen: Recorder) {
  const left = BLEED + 4.6;
  const top = BLEED + 33.5;
  const scale = 54 / 360;
  const at = (x: number, y: number): Pt => [left + x * scale, top + y * scale];
  const paths = [
    "M4 64 C22 64 28 42 50 40 C66 38 72 56 58 62 C46 68 44 48 62 44 C82 40 96 66 122 62",
    "M122 66 C146 84 162 80 180 66",
    "M180 66 C198 80 214 84 238 66",
    "M356 64 C338 64 332 42 310 40 C294 38 288 56 302 62 C314 68 316 48 298 44 C278 40 264 66 238 62",
  ];
  for (const path of paths) stroke(pen, trace(path).map(([x, y]) => at(x, y)), 0.16);
  skull(pen, at(122, 38)[0], at(122, 38)[1]);
  skull(pen, at(238, 38)[0], at(238, 38)[1]);
  skull(pen, at(180, 35.4)[0], at(180, 35.4)[1], 1.08);
}

function frame(pen: Recorder) {
  const width = TRIM_W + BLEED * 2;
  const height = TRIM_H + BLEED * 2;
  pen.rect({ x: 0, y: 0, w: width, h: height }, { fill: GROUND });
  pen.rect({ x: BLEED + 1.8, y: BLEED + 1.8, w: TRIM_W - 3.6, h: TRIM_H - 3.6 }, { stroke: SILVER, sw: 0.22 });
  pen.rect({ x: BLEED + 3, y: BLEED + 3, w: TRIM_W - 6, h: TRIM_H - 6 }, { stroke: SILVER, sw: 0.07 });
  corner(pen, 52, 52, 1, 1);
  corner(pen, 578, 52, -1, 1);
  corner(pen, 52, 828, 1, -1);
  corner(pen, 578, 828, -1, -1);
  stroke(pen, trace("M250 58 C272 58 280 36 302 34 C314 32 318 48 304 52 C292 56 294 40 306 38").map(([x, y]) => mm(x, y)));
  stroke(pen, trace("M380 58 C358 58 350 36 328 34 C316 32 312 48 326 52 C338 56 336 40 324 38").map(([x, y]) => mm(x, y)));
  const [dotX, dotY] = mm(315, 46);
  pen.circle(dotX, dotY, 0.23, { fill: BLOOD });
  diamonds(pen);
}

function kindColor(kind: string): string {
  if (kind.startsWith("Услуг")) return "#f0c2c4";
  if (kind.startsWith("Соревн")) return "#f0d2b0";
  return "#d5e0ea";
}

function drawFront(pen: Recorder, values: Record<string, string>) {
  frame(pen);
  pen.text(values.kind || "", {
    x: BLEED + TRIM_W / 2,
    y: BLEED + 16.2,
    font: "serif",
    size: 9,
    color: kindColor(values.kind || ""),
    align: "center",
  });
  pen.textBox(values.title || "", {
    x: BLEED + 7,
    y: BLEED + 17.6,
    w: TRIM_W - 14,
    h: 12,
  }, {
    font: "serif",
    size: 13,
    color: PAPER,
    align: "center",
    lineHeight: 1.12,
  });
  ornament(pen);
  pen.textBox(values.rules || "", {
    x: BLEED + 6.2,
    y: BLEED + 50.5,
    w: TRIM_W - 12.4,
    h: 33.5,
  }, {
    font: "serif",
    size: 7.6,
    color: BODY,
    align: "center",
    lineHeight: 1.28,
  });
}

function drawBack(pen: Recorder, values: Record<string, string>) {
  frame(pen);
  pen.text(values.label || "", {
    x: BLEED + TRIM_W / 2,
    y: BLEED + TRIM_H / 2 + 1.2,
    font: "serif",
    size: 11,
    color: SILVER,
    align: "center",
  });
}

export const portal: Design = {
  id: "portal",
  title: "Портал",
  description: "Карта действия на хэллоуин: тип, название и правило. Тёмное поле и серебряные завитки.",
  trim: { w: TRIM_W, h: TRIM_H },
  bleed: BLEED,
  backMode: "shared",
  fields: {
    front: [
      { id: "kind", kind: "text", name: "Тип", required: true, maxLength: 18 },
      { id: "title", kind: "text", name: "Название", required: true, maxLength: 40 },
      { id: "rules", kind: "text", name: "Правило", required: true, maxLength: 420 },
    ],
    back: [{ id: "label", kind: "text", name: "Подпись рубашки", required: true, maxLength: 24 }],
  },
  render(face, values, pen) {
    if (face === "back") drawBack(pen, values);
    else drawFront(pen, values);
  },
};
