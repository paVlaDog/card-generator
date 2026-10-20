export type FaceId = "front" | "back";

export type FieldSpec = {
  id: string;
  kind: "image" | "text";
  name: string;
  required: boolean;
  maxLength?: number;
};

export type Box = { x: number; y: number; w: number; h: number };

export type FontId = "serif" | "serifBold" | "sans" | "sansBold";

export type Paint = { fill?: string; stroke?: string; sw?: number };

export type DrawOp =
  | ({ t: "rect"; box: Box; radius?: number } & Paint)
  | ({ t: "polygon"; points: Array<[number, number]> } & Paint)
  | ({ t: "polyline"; points: Array<[number, number]> } & Paint)
  | ({ t: "circle"; cx: number; cy: number; r: number } & Paint)
  | { t: "image"; path: string; box: Box; fit: "cover" | "contain" }
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
    };

export type Measurer = {
  width(text: string, font: FontId, sizePt: number): number;
};

export type Recorder = {
  rect(box: Box, style?: Paint & { radius?: number }): void;
  circle(cx: number, cy: number, r: number, style?: Paint): void;
  polygon(points: Array<[number, number]>, style?: Paint): void;
  polyline(points: Array<[number, number]>, style?: Paint): void;
  image(path: string, box: Box, fit?: "cover" | "contain"): void;
  text(
    value: string,
    opts: {
      x: number;
      y: number;
      font: FontId;
      size: number;
      color: string;
      align?: "left" | "center" | "right";
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

export type Design = {
  id: string;
  title: string;
  description: string;
  trim: { w: number; h: number };
  bleed: number;
  backMode: "none" | "shared" | "per-card";
  fields: { front: FieldSpec[]; back: FieldSpec[] };
  render(face: FaceId, values: Record<string, string>, pen: Recorder): void;
};

export type CardDef = {
  id: string;
  title: string;
  count: number;
  front: Record<string, string>;
  back?: Record<string, string>;
};

export type Deck = {
  id: string;
  designId: string;
  title: string;
  cards: CardDef[];
  back?: Record<string, string>;
};

export function bleedBox(design: Pick<Design, "trim" | "bleed">): { w: number; h: number } {
  return { w: design.trim.w + design.bleed * 2, h: design.trim.h + design.bleed * 2 };
}

export function faceValues(
  design: Design,
  deck: Deck,
  card: CardDef,
  face: FaceId,
): Record<string, string> | null {
  if (face === "front") return card.front;
  if (design.backMode === "none") return null;
  if (design.backMode === "shared") return deck.back ?? {};
  return card.back ?? {};
}
