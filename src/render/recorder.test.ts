import { describe, expect, it } from "vitest";
import type { Measurer } from "../model/types";
import { createRecorder } from "./recorder";

const measurer: Measurer = {
  width(text) {
    return text.length * 2;
  },
};

describe("recorder", () => {
  it("bakes center alignment into the left anchor", () => {
    const pen = createRecorder(measurer);
    pen.text("AB", { x: 10, y: 5, font: "serif", size: 12, color: "#000", align: "center" });
    expect(pen.ops[0]).toMatchObject({ t: "text", x: 8, y: 5, rotate: 0, align: "left" });
  });

  it("rotates a point 180 degrees around the given center", () => {
    const pen = createRecorder(measurer);
    pen.rotate(180, 0, 0);
    pen.text("A", { x: 4, y: 2, font: "serif", size: 12, color: "#000" });
    const op = pen.ops[0];
    if (op.t !== "text") throw new Error("expected text");
    expect(op.x).toBeCloseTo(-4);
    expect(op.y).toBeCloseTo(-2);
    expect(op.rotate).toBeCloseTo(180);
  });
});
