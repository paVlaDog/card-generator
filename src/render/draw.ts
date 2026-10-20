import type { Design, DrawOp, FaceId, Measurer } from "../model/types";
import { createRecorder } from "./recorder";

export function renderOps(
  design: Design,
  face: FaceId,
  values: Record<string, string>,
  measurer: Measurer,
): DrawOp[] {
  const pen = createRecorder(measurer);
  design.render(face, values, pen);
  return pen.ops;
}

export function sheetCaption(
  face: FaceId,
  sheetTitle: string,
  index: number,
  total: number,
): string {
  const side = face === "front" ? "лицо" : "оборот";
  return `Лист ${index + 1} из ${total} · ${side} · ${sheetTitle} · переворот по длинной стороне`;
}
