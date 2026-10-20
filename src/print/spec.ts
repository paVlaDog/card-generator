export type SheetFormat = {
  id: "sra3" | "a3" | "a4";
  title: string;
  w: number;
  h: number;
};

export const SHEETS: SheetFormat[] = [
  { id: "sra3", title: "SRA3", w: 320, h: 450 },
  { id: "a3", title: "A3", w: 297, h: 420 },
  { id: "a4", title: "A4", w: 210, h: 297 },
];

/** Minimum distance from the sheet edge to the first trim line. */
export const TRIM_MARGIN = 12;
export const MARK_GAP = 3;
export const MARK_LEN = 5;

export type Grid = {
  cols: number;
  rows: number;
  stepX: number;
  stepY: number;
  firstTrimX: number;
  firstTrimY: number;
  bleed: number;
  trim: { w: number; h: number };
};

export type Mark = { x1: number; y1: number; x2: number; y2: number };

function fitCount(inner: number, item: number, gutter: number): number {
  let count = 0;
  while ((count + 1) * item + count * gutter <= inner + 1e-6) count += 1;
  return count;
}

/**
 * Cards sit on a rigid grid. Bleed boxes of neighbours touch, so the gap
 * between trim lines is exactly two bleeds and comes off as waste.
 * The trim block is centered; both outer margins stay at least TRIM_MARGIN.
 */
export function gridFor(
  trim: { w: number; h: number },
  bleed: number,
  sheet: { w: number; h: number },
  margin = TRIM_MARGIN,
): Grid {
  const gutter = bleed * 2;
  const cols = fitCount(sheet.w - margin * 2, trim.w, gutter);
  const rows = fitCount(sheet.h - margin * 2, trim.h, gutter);
  const spanX = cols > 0 ? cols * trim.w + (cols - 1) * gutter : 0;
  const spanY = rows > 0 ? rows * trim.h + (rows - 1) * gutter : 0;
  return {
    cols,
    rows,
    stepX: trim.w + gutter,
    stepY: trim.h + gutter,
    firstTrimX: (sheet.w - spanX) / 2,
    firstTrimY: (sheet.h - spanY) / 2,
    bleed,
    trim,
  };
}

export function cellTrim(grid: Grid, col: number, row: number): { x: number; y: number } {
  return { x: grid.firstTrimX + col * grid.stepX, y: grid.firstTrimY + row * grid.stepY };
}

export function cropMarks(grid: Grid): Mark[] {
  if (grid.cols <= 0 || grid.rows <= 0) return [];
  const marks: Mark[] = [];
  const xs: number[] = [];
  const ys: number[] = [];
  for (let col = 0; col < grid.cols; col += 1) {
    const left = grid.firstTrimX + col * grid.stepX;
    xs.push(left, left + grid.trim.w);
  }
  for (let row = 0; row < grid.rows; row += 1) {
    const top = grid.firstTrimY + row * grid.stepY;
    ys.push(top, top + grid.trim.h);
  }
  const topBleed = grid.firstTrimY - grid.bleed;
  const botBleed = grid.firstTrimY + (grid.rows - 1) * grid.stepY + grid.trim.h + grid.bleed;
  const leftBleed = grid.firstTrimX - grid.bleed;
  const rightBleed = grid.firstTrimX + (grid.cols - 1) * grid.stepX + grid.trim.w + grid.bleed;
  for (const x of xs) {
    marks.push({ x1: x, y1: topBleed - MARK_GAP - MARK_LEN, x2: x, y2: topBleed - MARK_GAP });
    marks.push({ x1: x, y1: botBleed + MARK_GAP, x2: x, y2: botBleed + MARK_GAP + MARK_LEN });
  }
  for (const y of ys) {
    marks.push({ x1: leftBleed - MARK_GAP - MARK_LEN, y1: y, x2: leftBleed - MARK_GAP, y2: y });
    marks.push({ x1: rightBleed + MARK_GAP, y1: y, x2: rightBleed + MARK_GAP + MARK_LEN, y2: y });
  }
  return marks;
}

export function cardPage(trim: { w: number; h: number }, bleed: number): Grid & { w: number; h: number } {
  const pad = bleed + MARK_GAP + MARK_LEN;
  const sheet = { w: trim.w + pad * 2, h: trim.h + pad * 2 };
  return { ...gridFor(trim, bleed, sheet, pad), w: sheet.w, h: sheet.h };
}

export function sheetLabel(sheetH: number, grid: Grid): { x: number; y: number } | null {
  if (grid.rows <= 0) return null;
  const botBleed = grid.firstTrimY + (grid.rows - 1) * grid.stepY + grid.trim.h + grid.bleed;
  const marksEnd = botBleed + MARK_GAP + MARK_LEN;
  const y = sheetH - 4.5;
  if (y < marksEnd + 3) return null;
  return { x: 6, y };
}

export function sheetById(id: string): SheetFormat {
  return SHEETS.find((sheet) => sheet.id === id) ?? SHEETS[0];
}
