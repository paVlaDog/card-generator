import { bleedBox, type Design, type DrawOp, type FaceId, type Measurer } from "../model/types";
import { cellTrim, cropMarks, type Grid, sheetLabel } from "../print/spec";
import { assetUrl, imagePlacement } from "./geometry";
import { renderOps, sheetCaption } from "./draw";

const SVG_NS = "http://www.w3.org/2000/svg";
let clipSeq = 0;

const FAMILY = { serif: "PT Serif", serifBold: "PT Serif", sans: "PT Sans", sansBold: "PT Sans" };
const WEIGHT = { serif: "400", serifBold: "700", sans: "400", sansBold: "700" };

function el<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, name);
}

const sizes = new Map<string, Promise<{ w: number; h: number } | null>>();

function imageSize(path: string): Promise<{ w: number; h: number } | null> {
  let pending = sizes.get(path);
  if (!pending) {
    pending = new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ w: image.naturalWidth, h: image.naturalHeight });
      image.onerror = () => resolve(null);
      image.src = assetUrl(path);
    });
    sizes.set(path, pending);
  }
  return pending;
}

function paint(node: SVGElement, style: { fill?: string; stroke?: string; sw?: number }) {
  node.setAttribute("fill", style.fill ?? "none");
  if (style.stroke) {
    node.setAttribute("stroke", style.stroke);
    node.setAttribute("stroke-width", String(style.sw ?? 0.2));
  }
}

function blank(w: number, h: number): SVGSVGElement {
  const svg = el("svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("width", `${w}mm`);
  svg.setAttribute("height", `${h}mm`);
  svg.setAttribute("role", "img");
  const defs = el("defs");
  svg.append(defs);
  return svg;
}

export async function appendOps(svg: SVGSVGElement, ops: DrawOp[], originX = 0, originY = 0): Promise<void> {
  const group = el("g");
  if (originX || originY) group.setAttribute("transform", `translate(${originX} ${originY})`);
  const defs = svg.querySelector("defs");
  for (const op of ops) {
    if (op.t === "rect") {
      const node = el("rect");
      node.setAttribute("x", String(op.box.x));
      node.setAttribute("y", String(op.box.y));
      node.setAttribute("width", String(op.box.w));
      node.setAttribute("height", String(op.box.h));
      paint(node, op);
      group.append(node);
    } else if (op.t === "circle") {
      const node = el("circle");
      node.setAttribute("cx", String(op.cx));
      node.setAttribute("cy", String(op.cy));
      node.setAttribute("r", String(op.r));
      paint(node, op);
      group.append(node);
    } else if (op.t === "polygon") {
      const node = el("polygon");
      node.setAttribute("points", op.points.map((point) => point.join(",")).join(" "));
      paint(node, op);
      group.append(node);
    } else if (op.t === "text") {
      const node = el("text");
      node.textContent = op.text;
      node.setAttribute("x", String(op.x));
      node.setAttribute("y", String(op.y));
      node.setAttribute("fill", op.color);
      node.setAttribute("font-family", FAMILY[op.font]);
      node.setAttribute("font-weight", WEIGHT[op.font]);
      node.setAttribute("font-size", String((op.size * 25.4) / 72));
      if (op.rotate) node.setAttribute("transform", `rotate(${op.rotate} ${op.x} ${op.y})`);
      group.append(node);
    } else if (op.t === "image") {
      const size = await imageSize(op.path);
      if (!size || !defs) continue;
      const placed = imagePlacement(op.box, size.w, size.h, op.fit);
      const id = `clip-${clipSeq++}`;
      const clip = el("clipPath");
      clip.id = id;
      const frame = el("rect");
      frame.setAttribute("x", String(op.box.x));
      frame.setAttribute("y", String(op.box.y));
      frame.setAttribute("width", String(op.box.w));
      frame.setAttribute("height", String(op.box.h));
      clip.append(frame);
      defs.append(clip);
      const image = el("image");
      image.setAttribute("href", assetUrl(op.path));
      image.setAttribute("x", String(placed.x));
      image.setAttribute("y", String(placed.y));
      image.setAttribute("width", String(placed.w));
      image.setAttribute("height", String(placed.h));
      image.setAttribute("clip-path", `url(#${id})`);
      image.setAttribute("preserveAspectRatio", "none");
      group.append(image);
    }
  }
  svg.append(group);
}

function guide(svg: SVGSVGElement, x: number, y: number, w: number, h: number) {
  const node = el("rect");
  node.setAttribute("x", String(x));
  node.setAttribute("y", String(y));
  node.setAttribute("width", String(w));
  node.setAttribute("height", String(h));
  node.setAttribute("fill", "none");
  node.setAttribute("stroke", "#c4342d");
  node.setAttribute("stroke-width", "0.28");
  svg.append(node);
}

export async function cardSvg(
  design: Design,
  face: FaceId,
  values: Record<string, string>,
  measurer: Measurer,
): Promise<SVGSVGElement> {
  const box = bleedBox(design);
  const svg = blank(box.w, box.h);
  svg.setAttribute("aria-label", "Карта с вылетом");
  await appendOps(svg, renderOps(design, face, values, measurer));
  guide(svg, design.bleed, design.bleed, design.trim.w, design.trim.h);
  return svg;
}

export async function sheetSvg(
  design: Design,
  measurer: Measurer,
  grid: Grid,
  sheet: { w: number; h: number; title: string },
  placed: Array<{ col: number; row: number; values: Record<string, string> }>,
  face: FaceId,
  index: number,
  total: number,
): Promise<SVGSVGElement> {
  const svg = blank(sheet.w, sheet.h);
  svg.setAttribute("aria-label", `Лист ${index + 1}`);
  const paper = el("rect");
  paper.setAttribute("width", String(sheet.w));
  paper.setAttribute("height", String(sheet.h));
  paper.setAttribute("fill", "#ffffff");
  svg.append(paper);
  for (const item of placed) {
    const trim = cellTrim(grid, item.col, item.row);
    await appendOps(svg, renderOps(design, face, item.values, measurer), trim.x - design.bleed, trim.y - design.bleed);
  }
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const trim = cellTrim(grid, col, row);
      guide(svg, trim.x, trim.y, design.trim.w, design.trim.h);
    }
  }
  for (const mark of cropMarks(grid)) {
    const line = el("line");
    line.setAttribute("x1", String(mark.x1));
    line.setAttribute("y1", String(mark.y1));
    line.setAttribute("x2", String(mark.x2));
    line.setAttribute("y2", String(mark.y2));
    line.setAttribute("stroke", "#1c1915");
    line.setAttribute("stroke-width", "0.45");
    svg.append(line);
  }
  const label = sheetLabel(sheet.h, grid);
  if (label) {
    const text = el("text");
    text.textContent = sheetCaption(face, sheet.title, index, total);
    text.setAttribute("x", String(label.x));
    text.setAttribute("y", String(label.y));
    text.setAttribute("fill", "#5c564c");
    text.setAttribute("font-family", "PT Sans");
    text.setAttribute("font-size", String((8 * 25.4) / 72));
    svg.append(text);
  }
  return svg;
}
