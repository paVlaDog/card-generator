import type { Design, Recorder } from "../../model/types";

/** 675×1050 px on the source pictures, so 63×98 mm keeps the same proportions. */
const TRIM_W = 63;
const TRIM_H = 98;

function draw(values: Record<string, string>, pen: Recorder): void {
  const box = { x: 0, y: 0, w: TRIM_W, h: TRIM_H };
  pen.rect(box, { fill: "#1a140e" });
  if (values.art) pen.image(values.art, box, "cover");
}

export const century: Design = {
  id: "century",
  title: "20 век",
  description: "Готовые карты: персонажи, роли и подсказки. Рисунок уже содержит всю карту, отдельного вылета нет. У персонажей общая рубашка, у ролей на обороте подсказка. Подсказки двусторонние: у каждой свой оборот.",
  trim: { w: TRIM_W, h: TRIM_H },
  bleed: 0,
  backMode: "shared",
  types: [
    { id: "characters", title: "Карты персонажей" },
    { id: "roles", title: "Карты ролей" },
    { id: "hints", title: "Подсказки", doubleSided: true },
  ],
  images: [],
  fields: {
    front: [{ id: "art", kind: "image", name: "Рисунок", required: true }],
    back: [{ id: "art", kind: "image", name: "Рубашка", required: true }],
  },
  render(_face, values, pen) {
    draw(values, pen);
  },
};
