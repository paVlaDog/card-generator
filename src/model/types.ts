export type FaceId = "front" | "back";

export type FieldSpec = {
  id: string;
  kind: "image" | "text";
  name: string;
  required: boolean;
  maxLength?: number;
};

export type Box = { x: number; y: number; w: number; h: number };

export type FontId = "serif" | "serifBold" | "sans" | "sansBold" | "fraktur";

export type Paint = { fill?: string; stroke?: string; sw?: number };

export type DrawOp =
  | ({ t: "rect"; box: Box; radius?: number } & Paint)
  | ({ t: "polygon"; points: Array<[number, number]> } & Paint)
  | ({ t: "polyline"; points: Array<[number, number]> } & Paint)
  | ({ t: "circle"; cx: number; cy: number; r: number } & Paint)
  | { t: "image"; path: string; box: Box; fit: "cover" | "contain" | "fill" }
  | {
      t: "text";
      text: string;
      x: number;
      y: number;
      font: FontId;
      size: number;
      color: string;
      align: "left";
      rotate: number;
      stroke?: string;
      sw?: number;
    };

export type Measurer = {
  width(text: string, font: FontId, sizePt: number): number;
};

export type Recorder = {
  rect(box: Box, style?: Paint & { radius?: number }): void;
  circle(cx: number, cy: number, r: number, style?: Paint): void;
  polygon(points: Array<[number, number]>, style?: Paint): void;
  polyline(points: Array<[number, number]>, style?: Paint): void;
  image(path: string, box: Box, fit?: "cover" | "contain" | "fill"): void;
  text(
    value: string,
    opts: {
      x: number;
      y: number;
      font: FontId;
      size: number;
      color: string;
      align?: "left" | "center" | "right";
      stroke?: string;
      sw?: number;
    },
  ): void;
  textBox(
    value: string,
    box: Box,
    opts: {
      font: FontId;
      size: number;
      color: string;
      align?: "left" | "center" | "right";
      lineHeight?: number;
    },
  ): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(deg: number, cx: number, cy: number): void;
  readonly ops: DrawOp[];
};

export type CardType = {
  id: string;
  title: string;
  /** Each card carries its own back instead of the type's shared shirt. */
  doubleSided?: boolean;
  /**
   * Cut-ready copy. This many millimetres of black sit between the picture and the
   * cut line, and the same amount continues outside the cut line.
   */
  cutBleed?: number;
};

export type DesignImage = {
  id: string;
  name: string;
  path: string;
};

/** The only card type of every design except Res Arcana. */
export const MAIN_TYPE: CardType = { id: "main", title: "Основной" };

export type Design = {
  id: string;
  title: string;
  description: string;
  trim: { w: number; h: number };
  bleed: number;
  /** Ordinary view is the trim. `bleed` is only the margin for the cutter. */
  optionalBleed?: boolean;
  backMode: "none" | "shared" | "per-card";
  /** Card kinds one deck of this design can hold. */
  types: CardType[];
  /** Pictures the design itself draws: background, icons, costs. Not card art. */
  images: DesignImage[];
  fields: { front: FieldSpec[]; back: FieldSpec[] };
  render(face: FaceId, values: Record<string, string>, pen: Recorder): void;
};

export type CardDef = {
  id: string;
  typeId: string;
  title: string;
  count: number;
  front: Record<string, string>;
  back?: Record<string, string>;
  /** Same card with bleed built around the picture, for the cutter. */
  cut?: Record<string, string>;
  /** Bleed copy of a double-sided card's own back. */
  cutBack?: Record<string, string>;
};

export type Deck = {
  id: string;
  designId: string;
  title: string;
  cards: CardDef[];
  /** Shared back of each card type. A type may have none until its back is ready. */
  backs?: Record<string, Record<string, string>>;
  /** Shared back with bleed, for types that store a cut-ready copy. */
  cutBacks?: Record<string, Record<string, string>>;
};

/**
 * Picture, then `amount` mm, then the cut line, then another `amount` mm.
 * `values.art` is the stored cut picture, which already fills that whole outer box.
 */
export function withCutCopy(design: Design, amount: number): Design {
  const trim = { w: design.trim.w + amount * 2, h: design.trim.h + amount * 2 };
  const outer = { x: 0, y: 0, w: trim.w + amount * 2, h: trim.h + amount * 2 };
  return {
    ...design,
    trim,
    bleed: amount,
    render(_face, values, pen) {
      pen.rect(outer, { fill: "#000000" });
      if (values.art) pen.image(values.art, outer, "fill");
    },
  };
}

export function typeCutBleed(design: Design, typeId: string): number {
  return design.types.find((type) => type.id === typeId)?.cutBleed ?? 0;
}

export function designCutAmount(design: Design): number {
  return design.types.reduce((max, type) => Math.max(max, type.cutBleed ?? 0), 0);
}

/** The viewer can switch this design between the trim and a cutter margin. */
export function offersPrintChoice(design: Design, typeId: string): boolean {
  return typeCutBleed(design, typeId) > 0 || Boolean(design.optionalBleed);
}

/** `cut` asks for stored cutter pictures, which only exist on types with `cutBleed`. */
export function usesCutArt(design: Design, cut: boolean): boolean {
  return cut && designCutAmount(design) > 0;
}

function trimOnly(design: Design): Design {
  const bleed = design.bleed;
  if (bleed <= 0) return design;
  const render = design.render;
  return {
    ...design,
    bleed: 0,
    render(face, values, pen) {
      pen.save();
      pen.translate(-bleed, -bleed);
      render(face, values, pen);
      pen.restore();
    },
  };
}

/** Ordinary view drops an optional print bleed. Cutter view keeps it, or the stored cut copy. */
export function shownDesign(design: Design, cut: boolean): Design {
  const amount = designCutAmount(design);
  if (cut && amount > 0) return withCutCopy(design, amount);
  if (!cut && design.optionalBleed) return trimOnly(design);
  return design;
}

export function bleedBox(design: Pick<Design, "trim" | "bleed">): { w: number; h: number } {
  return { w: design.trim.w + design.bleed * 2, h: design.trim.h + design.bleed * 2 };
}

export function isDoubleSided(design: Design, typeId: string): boolean {
  return design.types.find((type) => type.id === typeId)?.doubleSided === true;
}

/** Whether the viewer should offer the back of this type. */
export function showsBack(design: Design, deck: Deck, typeId: string): boolean {
  if (isDoubleSided(design, typeId)) return true;
  if (design.backMode === "per-card") return true;
  if (design.backMode === "shared") return Boolean(deck.backs?.[typeId]);
  return false;
}

export function faceValues(
  design: Design,
  deck: Deck,
  card: CardDef,
  face: FaceId,
  cut = false,
): Record<string, string> | null {
    if (cut) {
    if (face === "front") return card.cut ?? null;
    if (isDoubleSided(design, card.typeId)) return card.cutBack ?? null;
    if (design.backMode === "none") return null;
    if (design.backMode === "shared") return deck.cutBacks?.[card.typeId] ?? null;
    return null;
  }
  if (face === "front") return card.front;
  if (isDoubleSided(design, card.typeId)) return card.back ?? null;
  if (design.backMode === "none") return null;
  if (design.backMode === "shared") return deck.backs?.[card.typeId] ?? null;
  return card.back ?? {};
}

export function cardsOfType(deck: Deck, typeId: string): CardDef[] {
  return deck.cards.filter((card) => card.typeId === typeId);
}
