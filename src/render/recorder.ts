import type { Box, DrawOp, FontId, Measurer, Recorder } from "../model/types";

type TextOpts = {
  x: number;
  y: number;
  font: FontId;
  size: number;
  color: string;
  align?: "left" | "center" | "right";
  stroke?: string;
  sw?: number;
};

type M = [number, number, number, number, number, number];

const ID: M = [1, 0, 0, 1, 0, 0];

function mul(p: M, q: M): M {
  const [a1, b1, c1, d1, e1, f1] = p;
  const [a2, b2, c2, d2, e2, f2] = q;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

function apply(m: M, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

function rotationOf(m: M): number {
  const deg = (Math.atan2(m[1], m[0]) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

function translate(x: number, y: number): M {
  return [1, 0, 0, 1, x, y];
}

function rotate(deg: number, cx: number, cy: number): M {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return mul(translate(cx, cy), mul([cos, sin, -sin, cos, 0, 0], translate(-cx, -cy)));
}

function mapPoints(m: M, points: Array<[number, number]>): Array<[number, number]> {
  return points.map(([x, y]) => apply(m, x, y));
}

function axisRect(points: Array<[number, number]>): Box | null {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const onBox = points.every(
    ([x, y]) =>
      (Math.abs(x - minX) < 1e-6 || Math.abs(x - maxX) < 1e-6) &&
      (Math.abs(y - minY) < 1e-6 || Math.abs(y - maxY) < 1e-6),
  );
  if (!onBox) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function wrap(text: string, maxWidth: number, widthOf: (line: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (widthOf(next) <= maxWidth || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export function createRecorder(measurer: Measurer): Recorder {
  const ops: DrawOp[] = [];
  const stack: M[] = [];
  let matrix: M = ID;

  function text(value: string, opts: TextOpts) {
    let x = opts.x;
    const align = opts.align ?? "left";
    if (align !== "left" && value) {
      const width = measurer.width(value, opts.font, opts.size);
      if (align === "center") x -= width / 2;
      if (align === "right") x -= width;
    }
    const [wx, wy] = apply(matrix, x, opts.y);
    ops.push({
      t: "text",
      text: value,
      x: wx,
      y: wy,
      font: opts.font,
      size: opts.size,
      color: opts.color,
      align: "left",
      rotate: rotationOf(matrix),
      stroke: opts.stroke,
      sw: opts.sw,
    });
  }

  const pen: Recorder = {
    ops,
    rect(box, style = {}) {
      const corners = mapPoints(matrix, [
        [box.x, box.y],
        [box.x + box.w, box.y],
        [box.x + box.w, box.y + box.h],
        [box.x, box.y + box.h],
      ]);
      const axis = axisRect(corners);
      if (axis) ops.push({ t: "rect", box: axis, radius: style.radius, ...style });
      else ops.push({ t: "polygon", points: corners, fill: style.fill, stroke: style.stroke, sw: style.sw });
    },
    circle(cx, cy, r, style = {}) {
      const [x, y] = apply(matrix, cx, cy);
      ops.push({ t: "circle", cx: x, cy: y, r, ...style });
    },
    polygon(points, style = {}) {
      ops.push({ t: "polygon", points: mapPoints(matrix, points), ...style });
    },
    polyline(points, style = {}) {
      if (points.length < 2) return;
      ops.push({ t: "polyline", points: mapPoints(matrix, points), ...style });
    },
    image(path, box, fit = "cover") {
      if (!path) return;
      const corners = mapPoints(matrix, [
        [box.x, box.y],
        [box.x + box.w, box.y],
        [box.x + box.w, box.y + box.h],
        [box.x, box.y + box.h],
      ]);
      const axis = axisRect(corners);
      if (!axis) return;
      ops.push({ t: "image", path, box: axis, fit });
    },
    text,
    textBox(value, box, opts) {
      const lineHeight = opts.lineHeight ?? 1.25;
      const layout = (size: number) => {
        const sizeMm = (size * 25.4) / 72;
        const leading = sizeMm * lineHeight;
        const lines = wrap(value, box.w, (line) => measurer.width(line, opts.font, size));
        const fits = lines.every((_, index) => {
          const baseline = sizeMm * 0.78 + index * leading;
          return baseline <= box.h + sizeMm * 0.2;
        });
        return { size, sizeMm, leading, lines, fits };
      };
      let laid = layout(opts.size);
      if (!laid.fits) {
        let low = 5;
        let high = opts.size;
        let best = layout(low);
        for (let step = 0; step < 12; step += 1) {
          const mid = (low + high) / 2;
          const trial = layout(mid);
          if (trial.fits) {
            best = trial;
            low = mid;
          } else high = mid;
        }
        laid = best;
      }
      laid.lines.forEach((line, index) => {
        const baseline = box.y + laid.sizeMm * 0.78 + index * laid.leading;
        if (baseline > box.y + box.h + laid.sizeMm * 0.2) return;
        let x = box.x;
        if (opts.align === "center") x = box.x + box.w / 2;
        if (opts.align === "right") x = box.x + box.w;
        text(line, {
          x,
          y: baseline,
          font: opts.font,
          size: laid.size,
          color: opts.color,
          align: opts.align ?? "left",
        });
      });
    },
    save() {
      stack.push(matrix);
    },
    restore() {
      matrix = stack.pop() ?? ID;
    },
    translate(x, y) {
      matrix = mul(matrix, translate(x, y));
    },
    rotate(deg, cx, cy) {
      matrix = mul(matrix, rotate(deg, cx, cy));
    },
  };

  return pen;
}
