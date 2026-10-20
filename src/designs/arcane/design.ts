import type { Design, Recorder } from "../../model/types";

const CREAM = "#f4efe4";
const INK = "#241c16";
const RED = "#8e2f2a";
const GOLD = "#9a7340";
const BLEED = 3;
const TRIM_W = 63;
const TRIM_H = 88;

function drawFront(pen: Recorder, values: Record<string, string>) {
  const width = TRIM_W + BLEED * 2;
  const height = TRIM_H + BLEED * 2;
  pen.rect({ x: 0, y: 0, w: width, h: height }, { fill: CREAM });
  pen.rect({ x: BLEED + 2.2, y: BLEED + 2.2, w: TRIM_W - 4.4, h: TRIM_H - 4.4 }, { stroke: INK, sw: 0.45 });
  pen.rect({ x: BLEED + 3.4, y: BLEED + 3.4, w: TRIM_W - 6.8, h: TRIM_H - 6.8 }, { stroke: RED, sw: 0.18 });

  pen.rect({ x: BLEED + 4.6, y: BLEED + 5, w: TRIM_W - 9.2, h: 11 }, { fill: INK });
  pen.text(values.title || "", {
    x: BLEED + TRIM_W / 2,
    y: BLEED + 12.4,
    font: "serifBold",
    size: 12,
    color: CREAM,
    align: "center",
  });

  const art = { x: BLEED + 4.6, y: BLEED + 17.4, w: TRIM_W - 9.2, h: 33 };
  pen.rect(art, { fill: "#e4d9c6" });
  if (values.art) pen.image(values.art, art, "cover");

  pen.text((values.kind || "").toUpperCase(), {
    x: BLEED + TRIM_W / 2,
    y: BLEED + 55.2,
    font: "sans",
    size: 7.5,
    color: RED,
    align: "center",
  });
  pen.rect({ x: BLEED + 12, y: BLEED + 57, w: TRIM_W - 24, h: 0.25 }, { fill: GOLD });
  pen.textBox(values.rules || "", {
    x: BLEED + 6.2,
    y: BLEED + 59,
    w: TRIM_W - 12.4,
    h: 22,
  }, {
    font: "serif",
    size: 8,
    color: INK,
    align: "center",
    lineHeight: 1.32,
  });
}

function drawBack(pen: Recorder, values: Record<string, string>) {
  const width = TRIM_W + BLEED * 2;
  const height = TRIM_H + BLEED * 2;
  pen.rect({ x: 0, y: 0, w: width, h: height }, { fill: INK });
  pen.rect({ x: 4.2, y: 4.2, w: width - 8.4, h: height - 8.4 }, { stroke: "#c6a15b", sw: 0.5 });
  pen.rect({ x: 6.4, y: 6.4, w: width - 12.8, h: height - 12.8 }, { stroke: "#c6a15b", sw: 0.18 });
  pen.polygon(
    [
      [width / 2, 22],
      [width - 16, height / 2],
      [width / 2, height - 22],
      [16, height / 2],
    ],
    { stroke: "#c6a15b", sw: 0.35 },
  );
  pen.text(values.label || "КОЛОДА", {
    x: width / 2,
    y: height / 2 + 1.5,
    font: "serif",
    size: 12,
    color: "#c6a15b",
    align: "center",
  });
}

export const arcane: Design = {
  id: "arcane",
  title: "Колдовская карта (пример)",
  description: "Иллюстрация, название, тип и текст правила. Рубашка общая на колоду.",
  trim: { w: TRIM_W, h: TRIM_H },
  bleed: BLEED,
  backMode: "shared",
  fields: {
    front: [
      { id: "art", kind: "image", name: "Иллюстрация", required: true },
      { id: "title", kind: "text", name: "Название", required: true, maxLength: 22 },
      { id: "kind", kind: "text", name: "Тип", required: true, maxLength: 18 },
      { id: "rules", kind: "text", name: "Правило", required: true, maxLength: 220 },
    ],
    back: [{ id: "label", kind: "text", name: "Подпись рубашки", required: true, maxLength: 24 }],
  },
  render(face, values, pen) {
    if (face === "back") drawBack(pen, values);
    else drawFront(pen, values);
  },
};
