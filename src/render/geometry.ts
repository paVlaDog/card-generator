import type { Box } from "../model/types";

export function imagePlacement(box: Box, imgW: number, imgH: number, fit: "cover" | "contain" | "fill"): Box {
  if (fit === "fill" || imgW <= 0 || imgH <= 0) return box;
  const scale =
    fit === "cover" ? Math.max(box.w / imgW, box.h / imgH) : Math.min(box.w / imgW, box.h / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}${path.replace(/^\//, "")}`;
}

export const MM_TO_PT = 72 / 25.4;
