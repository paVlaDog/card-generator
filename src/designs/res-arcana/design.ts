import type { CardType, Design, DesignImage, Recorder } from "../../model/types";

const GOLD = "#e4c27a";
const GOLD_INK = "#6a4a22";
const PARCHMENT = "#f6edd9";
const INK = "#2a2118";
const CREAM = "#f8f1df";
const BLEED = 3;
const TRIM_W = 62;
const TRIM_H = 87;

type Essence = "elan" | "life" | "calm" | "death" | "gold" | "any";

type Pip = { essence: Essence; count: number } | { zero: true };

const FILL: Record<Essence, string> = {
  elan: "#d6453d",
  life: "#2f8f46",
  calm: "#2f6faf",
  death: "#1a171c",
  gold: "#e2b431",
  any: "#f3ecdf",
};

function pipMark(pen: Recorder, cx: number, cy: number, radius: number, essence: Essence) {
  const ink = essence === "gold" || essence === "any" ? GOLD_INK : CREAM;
  if (essence === "elan") {
    pen.polygon(
      [
        [cx, cy - radius * 0.48],
        [cx + radius * 0.4, cy + radius * 0.42],
        [cx - radius * 0.4, cy + radius * 0.42],
      ],
      { fill: ink },
    );
  } else if (essence === "life") {
    pen.circle(cx, cy + radius * 0.05, radius * 0.28, { fill: ink });
  } else if (essence === "calm") {
    pen.polyline(
      [
        [cx - radius * 0.42, cy + radius * 0.08],
        [cx - radius * 0.14, cy - radius * 0.24],
        [cx + radius * 0.12, cy + radius * 0.24],
        [cx + radius * 0.42, cy - radius * 0.06],
      ],
      { stroke: ink, sw: 0.32 },
    );
  } else if (essence === "death") {
    pen.polygon(
      [
        [cx, cy - radius * 0.4],
        [cx + radius * 0.34, cy],
        [cx, cy + radius * 0.4],
        [cx - radius * 0.34, cy],
      ],
      { fill: ink },
    );
  } else {
    pen.circle(cx, cy, radius * 0.4, { stroke: ink, sw: 0.28 });
  }
}

function pip(pen: Recorder, cx: number, cy: number, radius: number, item: Pip) {
  if ("zero" in item) {
    pen.circle(cx, cy, radius, { fill: PARCHMENT, stroke: GOLD, sw: 0.35 });
    pen.text("0", {
      x: cx,
      y: cy + 1.15,
      font: "serifBold",
      size: 9,
      color: INK,
      align: "center",
    });
    return;
  }
  pen.circle(cx, cy, radius, { fill: FILL[item.essence], stroke: "#f4e7c8", sw: 0.38 });
  if (item.count === 1) {
    pipMark(pen, cx, cy, radius, item.essence);
    return;
  }
  const ink = item.essence === "gold" || item.essence === "any" ? GOLD_INK : CREAM;
  pen.text(String(item.count), {
    x: cx,
    y: cy + 1.2,
    font: "serifBold",
    size: 9,
    color: ink,
    align: "center",
  });
}

const ASSET = "assets/res-arcana";

function picture(id: string, name: string, file: string): DesignImage {
  return { id, name, path: `${ASSET}/${file}` };
}

function icon(id: string, name: string, file: string): DesignImage {
  return picture(id, name, `icons/${file}`);
}

export const resArcanaTypes: CardType[] = [
  { id: "artifacts", title: "Артефакты" },
  { id: "scrolls", title: "Свитки" },
  { id: "mercenaries", title: "Наёмники" },
  { id: "monuments", title: "Монументы" },
];

export const resArcanaImages: DesignImage[] = [
  picture("background", "Фон", "background.png"),
  picture("cost-1", "Флаг стоимости, 1 слот", "cost-1.png"),
  picture("cost-2", "Флаг стоимости, 2 слота", "cost-2.png"),
  picture("cost-3", "Флаг стоимости, 3 слота", "cost-3.png"),
  picture("cost-4", "Флаг стоимости, 4 слота", "cost-4.png"),
  picture("fire", "Огонь", "resource-fire.png"),
  picture("water", "Вода", "resource-water.png"),
  picture("life", "Жизнь", "resource-life.png"),
  picture("death", "Смерть", "resource-death.png"),
  picture("gold", "Золото", "resource-gold.png"),
  picture("pearl", "Жемчуг", "resource-pearl.png"),
  icon("cost", "Стоимость", "cost.png"),
  icon("collect", "Сбор", "collect.png"),
  icon("this-card", "Эта карта", "this-card.png"),
  icon("any-card", "Любая карта", "any-card.png"),
  icon("turn-this", "Поверните эту карту", "turn-this.png"),
  icon("reveal-any", "Разверните любую карту", "reveal-any.png"),
  icon("pay-calm", "Заплатите 1 Покой", "pay-calm.png"),
  icon("pay-any-3", "Заплатите 3 любых", "pay-any-3.png"),
  icon("dragon", "Дракон", "dragon.png"),
  icon("creature", "Существо", "creature.png"),
  icon("demon", "Демон", "demon.png"),
  icon("monument", "Монумент", "monument.png"),
  icon("turn-dragon", "Поверните дракона", "turn-dragon.png"),
  icon("reveal-creature", "Разверните существо", "reveal-creature.png"),
  icon("lose-life", "Потеряйте 2 жизни", "lose-life.png"),
  icon("react", "Ответ на потерю жизни", "react.png"),
  icon("any", "Любой ресурс", "any.png"),
  icon("any-not-gold", "Любая, но не золото", "any-not-gold.png"),
  icon("any-not-gold-death", "Любая, но не золото и смерть", "any-not-gold-death.png"),
  icon("any-2", "2 любых", "any-2.png"),
  icon("any-n", "X одинаковых", "any-n.png"),
  icon("discard", "Сбросьте", "discard.png"),
  icon("value", "Значение", "value.png"),
  icon("destroy", "Уничтожьте", "destroy.png"),
  icon("gain", "Получите", "gain.png"),
];

function designImage(id: string): string {
  const found = resArcanaImages.find((item) => item.id === id);
  if (!found) throw new Error(`В дизайне Res Arcana нет картинки ${id}`);
  return found.path;
}

function drawFront(pen: Recorder, _values: Record<string, string>) {
  void _values;
  const width = TRIM_W + BLEED * 2;
  const height = TRIM_H + BLEED * 2;
  pen.rect({ x: 0, y: 0, w: width, h: height }, { fill: "#ceb082" });
  pen.image(designImage("background"), { x: 0, y: 0, w: width, h: height }, "cover");
}

function drawBack(pen: Recorder, values: Record<string, string>) {
  const width = TRIM_W + BLEED * 2;
  const height = TRIM_H + BLEED * 2;
  pen.rect({ x: 0, y: 0, w: width, h: height }, { fill: "#4a2e1e" });
  pen.rect({ x: BLEED + 1.5, y: BLEED + 1.5, w: TRIM_W - 3, h: TRIM_H - 3 }, { stroke: GOLD, sw: 0.7 });
  pen.rect({ x: BLEED + 2.8, y: BLEED + 2.8, w: TRIM_W - 5.6, h: TRIM_H - 5.6 }, { stroke: GOLD, sw: 0.16 });
  const cx = width / 2;
  const cy = height / 2 - 4;
  const essences: Essence[] = ["elan", "life", "calm", "death", "gold"];
  essences.forEach((essence, index) => {
    const angle = -Math.PI / 2 + index * ((Math.PI * 2) / essences.length);
    pip(pen, cx + Math.cos(angle) * 16, cy + Math.sin(angle) * 16, 3.5, { essence, count: 1 });
  });
  pen.circle(cx, cy, 7.2, { fill: "#3a2418", stroke: GOLD, sw: 0.35 });
  pen.text(values.label || "АРТЕФАКТЫ", {
    x: cx,
    y: cy + 30,
    font: "serif",
    size: 11,
    color: GOLD,
    align: "center",
  });
}

export const resArcana: Design = {
  id: "res-arcana",
  title: "Res Arcana",
  description: "Пергамент 62×87 мм. В одной колоде четыре типа: артефакты, свитки, наёмники и монументы.",
  trim: { w: TRIM_W, h: TRIM_H },
  bleed: BLEED,
  backMode: "shared",
  types: resArcanaTypes,
  images: resArcanaImages,
  fields: {
    front: [
      { id: "art", kind: "image", name: "Иллюстрация", required: true },
      { id: "title", kind: "text", name: "Название", required: true, maxLength: 26 },
      { id: "cost", kind: "text", name: "Стоимость", required: true, maxLength: 48 },
      { id: "kind", kind: "text", name: "Тип", required: true, maxLength: 24 },
      { id: "rules", kind: "text", name: "Правило", required: true, maxLength: 280 },
      { id: "points", kind: "text", name: "Победные очки", required: false, maxLength: 3 },
    ],
    back: [{ id: "label", kind: "text", name: "Подпись рубашки", required: true, maxLength: 24 }],
  },
  render(face, values, pen) {
    if (face === "back") drawBack(pen, values);
    else drawFront(pen, values);
  },
};
