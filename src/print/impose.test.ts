import { describe, expect, it } from "vitest";
import { expandCounts, placements, sheetCount } from "./impose";
import { cropMarks, gridFor, MARK_GAP, SHEETS, TRIM_MARGIN } from "./spec";

const poker = { w: 63, h: 88 };
const bleed = 3;
const sra3 = SHEETS[0];
const a3 = SHEETS[1];

describe("imposition", () => {
  it("fits a 4×4 poker grid on SRA3 with symmetric margins", () => {
    const grid = gridFor(poker, bleed, sra3);
    const span = 4 * 63 + 3 * 6;
    expect(grid.cols).toBe(4);
    expect(grid.rows).toBe(4);
    expect(grid.firstTrimX).toBeCloseTo((sra3.w - span) / 2);
    expect(grid.firstTrimY).toBeCloseTo((sra3.h - (4 * 88 + 3 * 6)) / 2);
    expect(grid.firstTrimX).toBeGreaterThanOrEqual(TRIM_MARGIN);
    expect(grid.firstTrimY).toBeGreaterThanOrEqual(TRIM_MARGIN);
  });

  it("lets neighbouring bleed boxes touch", () => {
    const grid = gridFor(poker, bleed, sra3);
    const rightBleed = grid.firstTrimX + poker.w + bleed;
    const nextLeftBleed = grid.firstTrimX + grid.stepX - bleed;
    expect(rightBleed).toBeCloseTo(nextLeftBleed);
    expect(grid.stepX - poker.w).toBeCloseTo(bleed * 2);
  });

  it("keeps crop marks on the sheet and outside the bleed", () => {
    const grid = gridFor(poker, bleed, sra3);
    const marks = cropMarks(grid);
    expect(marks.length).toBeGreaterThan(0);
    for (const mark of marks) {
      for (const value of [mark.x1, mark.x2]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(sra3.w);
      }
      for (const value of [mark.y1, mark.y2]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(sra3.h);
      }
    }
    const top = marks.find((mark) => mark.x1 === grid.firstTrimX && mark.y1 < grid.firstTrimY);
    expect(top?.y2).toBeCloseTo(grid.firstTrimY - bleed - MARK_GAP);
  });

  it("still has a legal margin on A3", () => {
    const grid = gridFor(poker, bleed, a3);
    expect(grid.cols).toBeGreaterThan(0);
    expect(grid.rows).toBeGreaterThan(0);
    expect(grid.firstTrimX).toBeGreaterThanOrEqual(TRIM_MARGIN);
    expect(grid.firstTrimY).toBeGreaterThanOrEqual(TRIM_MARGIN);
  });

  it("mirrors the back across the long edge", () => {
    const front = placements(2, 4, 4, 0, "front");
    const back = placements(2, 4, 4, 0, "back");
    expect(front.map((item) => [item.cardIndex, item.col, item.row])).toEqual([
      [0, 0, 0],
      [1, 1, 0],
    ]);
    expect(back.map((item) => [item.cardIndex, item.col, item.row])).toEqual([
      [0, 3, 0],
      [1, 2, 0],
    ]);
  });

  it("expands copies and counts sheets, including a partial last sheet", () => {
    const cards = expandCounts([
      { id: "a", count: 2 },
      { id: "b", count: 1 },
    ]);
    expect(cards.map((card) => card.id)).toEqual(["a", "a", "b"]);
    expect(sheetCount(18, 4, 4)).toBe(2);
    expect(placements(18, 4, 4, 1, "front")).toHaveLength(2);
  });
});
