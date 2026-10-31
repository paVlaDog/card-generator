import fontkit from "@pdf-lib/fontkit";
import {
  clip,
  closePath,
  degrees,
  endPath,
  fill as fillPath,
  fillAndStroke,
  LineCapStyle,
  LineJoinStyle,
  lineTo,
  moveTo,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setFillingRgbColor,
  setLineCap,
  setLineJoin,
  setLineWidth,
  setStrokingRgbColor,
  setTextRenderingMode,
  stroke as strokePath,
  TextRenderingMode,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { bleedBox, faceValues, isDoubleSided, shownDesign, usesCutArt, type CardDef, type Design, type Deck, type DrawOp, type FaceId, type FontId, type Measurer } from "../model/types";
import { cardsForSheets, expandCounts, placements, sheetCount } from "../print/impose";
import { cardPage, cellTrim, cropMarks, gridFor, sheetLabel, sheetMargin, type Mark, type SheetFormat } from "../print/spec";
import { sheetCaption } from "./draw";
import { renderOps } from "./draw";
import { embedFonts } from "./fonts";
import { assetUrl, imagePlacement, MM_TO_PT } from "./geometry";

type Session = {
  pdf: PDFDocument;
  fonts: Record<FontId, PDFFont>;
  images: Map<string, Promise<PDFImage | null>>;
  measurer: Measurer;
};

function colorOf(hex: string) {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

async function openSession(measurer: Measurer): Promise<Session> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  return { pdf, fonts: await embedFonts(pdf), images: new Map(), measurer };
}

async function imageFor(session: Session, path: string): Promise<PDFImage | null> {
  let pending = session.images.get(path);
  if (!pending) {
    pending = (async () => {
      const response = await fetch(assetUrl(path));
      if (!response.ok) return null;
      const bytes = await response.arrayBuffer();
      const head = new Uint8Array(bytes.slice(0, 8));
      const png = head[0] === 0x89 && head[1] === 0x50;
      return png ? session.pdf.embedPng(bytes) : session.pdf.embedJpg(bytes);
    })();
    session.images.set(path, pending);
  }
  return pending;
}

async function paintOps(
  session: Session,
  page: PDFPage,
  ops: DrawOp[],
  originX: number,
  originY: number,
  clipTo?: { w: number; h: number },
) {
  const pageH = page.getHeight();
  if (clipTo) {
    const x = originX * MM_TO_PT;
    const y = pageH - (originY + clipTo.h) * MM_TO_PT;
    const w = clipTo.w * MM_TO_PT;
    const h = clipTo.h * MM_TO_PT;
    page.pushOperators(
      pushGraphicsState(),
      moveTo(x, y),
      lineTo(x + w, y),
      lineTo(x + w, y + h),
      lineTo(x, y + h),
      closePath(),
      clip(),
      endPath(),
    );
  }
  for (const op of ops) {
    if (op.t === "rect" || op.t === "polygon" || op.t === "polyline" || op.t === "circle") {
      const fill = op.fill ? colorOf(op.fill) : undefined;
      const stroke = op.stroke ? colorOf(op.stroke) : undefined;
      const sw = op.stroke ? (op.sw ?? 0.2) * MM_TO_PT : undefined;
      if (op.t === "rect") {
        page.drawRectangle({
          x: (originX + op.box.x) * MM_TO_PT,
          y: pageH - (originY + op.box.y + op.box.h) * MM_TO_PT,
          width: op.box.w * MM_TO_PT,
          height: op.box.h * MM_TO_PT,
          color: fill,
          borderColor: stroke,
          borderWidth: sw,
        });
      } else if (op.t === "circle") {
        page.drawCircle({
          x: (originX + op.cx) * MM_TO_PT,
          y: pageH - (originY + op.cy) * MM_TO_PT,
          size: op.r * MM_TO_PT,
          color: fill,
          borderColor: stroke,
          borderWidth: sw,
        });
      } else if (op.points.length > 0) {
        const commands = [
          pushGraphicsState(),
          setLineCap(LineCapStyle.Round),
          setLineJoin(LineJoinStyle.Round),
        ];
        if (fill) commands.push(setFillingRgbColor(fill.red, fill.green, fill.blue));
        if (stroke && sw) commands.push(setStrokingRgbColor(stroke.red, stroke.green, stroke.blue), setLineWidth(sw));
        op.points.forEach((point, index) => {
          const x = (originX + point[0]) * MM_TO_PT;
          const y = pageH - (originY + point[1]) * MM_TO_PT;
          commands.push(index === 0 ? moveTo(x, y) : lineTo(x, y));
        });
        if (op.t === "polygon") commands.push(closePath());
        if (fill && stroke) commands.push(fillAndStroke());
        else if (fill) commands.push(fillPath());
        else if (stroke) commands.push(strokePath());
        commands.push(popGraphicsState());
        page.pushOperators(...commands);
      }
    } else if (op.t === "text") {
      if (op.stroke) {
        const stroke = colorOf(op.stroke);
        page.pushOperators(
          pushGraphicsState(),
          setStrokingRgbColor(stroke.red, stroke.green, stroke.blue),
          setLineWidth((op.sw ?? 0.35) * MM_TO_PT),
          setLineJoin(LineJoinStyle.Round),
          setLineCap(LineCapStyle.Round),
          setTextRenderingMode(TextRenderingMode.FillAndOutline),
        );
      }
      page.drawText(op.text, {
        x: (originX + op.x) * MM_TO_PT,
        y: pageH - (originY + op.y) * MM_TO_PT,
        size: op.size,
        font: session.fonts[op.font],
        color: colorOf(op.color),
        rotate: op.rotate ? degrees(-op.rotate) : undefined,
      });
      if (op.stroke) page.pushOperators(popGraphicsState());
    } else if (op.t === "image") {
      const image = await imageFor(session, op.path);
      if (!image) continue;
      const placed = imagePlacement(op.box, image.width, image.height, op.fit);
      const x = (originX + placed.x) * MM_TO_PT;
      const y = pageH - (originY + placed.y + placed.h) * MM_TO_PT;
      const clipX = (originX + op.box.x) * MM_TO_PT;
      const clipY = pageH - (originY + op.box.y + op.box.h) * MM_TO_PT;
      const clipW = op.box.w * MM_TO_PT;
      const clipH = op.box.h * MM_TO_PT;
      page.pushOperators(
        pushGraphicsState(),
        moveTo(clipX, clipY),
        lineTo(clipX + clipW, clipY),
        lineTo(clipX + clipW, clipY + clipH),
        lineTo(clipX, clipY + clipH),
        closePath(),
        clip(),
        endPath(),
      );
      page.drawImage(image, { x, y, width: placed.w * MM_TO_PT, height: placed.h * MM_TO_PT });
      page.pushOperators(popGraphicsState());
    }
  }
  if (clipTo) page.pushOperators(popGraphicsState());
}

function paintMarks(page: PDFPage, marks: Mark[]) {
  const pageH = page.getHeight();
  for (const mark of marks) {
    page.drawLine({
      start: { x: mark.x1 * MM_TO_PT, y: pageH - mark.y1 * MM_TO_PT },
      end: { x: mark.x2 * MM_TO_PT, y: pageH - mark.y2 * MM_TO_PT },
      thickness: 0.25,
      color: rgb(0, 0, 0),
    });
  }
}

async function addCard(session: Session, design: Design, face: FaceId, values: Record<string, string>) {
  const pageBox = cardPage(design.trim, design.bleed);
  const page = session.pdf.addPage([pageBox.w * MM_TO_PT, pageBox.h * MM_TO_PT]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageBox.w * MM_TO_PT,
    height: pageBox.h * MM_TO_PT,
    color: rgb(1, 1, 1),
  });
  const originX = pageBox.firstTrimX - design.bleed;
  const originY = pageBox.firstTrimY - design.bleed;
  await paintOps(session, page, renderOps(design, face, values, session.measurer), originX, originY, bleedBox(design));
  paintMarks(page, cropMarks(pageBox));
}

async function addSheet(
  session: Session,
  design: Design,
  deck: Deck,
  sheet: SheetFormat,
  sheetIndex: number,
  face: FaceId,
  cut = false,
) {
  const shown = shownDesign(design, cut);
  const art = usesCutArt(design, cut);
  const printing: Deck = art ? { ...deck, cards: deck.cards.filter((card) => card.cut) } : deck;
  const grid = gridFor(shown.trim, shown.bleed, sheet, sheetMargin(shown.bleed));
  const expanded = expandCounts(printing.cards);
  const total = sheetCount(expanded.length, grid.cols, grid.rows);
  const page = session.pdf.addPage([sheet.w * MM_TO_PT, sheet.h * MM_TO_PT]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: sheet.w * MM_TO_PT,
    height: sheet.h * MM_TO_PT,
    color: rgb(1, 1, 1),
  });
  for (const item of placements(expanded.length, grid.cols, grid.rows, sheetIndex, face)) {
    const card = expanded[item.cardIndex];
    const values = faceValues(design, printing, card, face, art);
    if (!values) continue;
    const trim = cellTrim(grid, item.col, item.row);
    const originX = trim.x - shown.bleed;
    const originY = trim.y - shown.bleed;
    await paintOps(session, page, renderOps(shown, face, values, session.measurer), originX, originY, bleedBox(shown));
  }
  if (shown.bleed > 0) paintMarks(page, cropMarks(grid));
  const label = sheetLabel(sheet.h, grid);
  if (label && total > 0) {
    page.drawText(sheetCaption(face, sheet.title, sheetIndex, total), {
      x: label.x * MM_TO_PT,
      y: page.getHeight() - label.y * MM_TO_PT,
      size: 8,
      font: session.fonts.sans,
      color: rgb(0.36, 0.33, 0.3),
    });
  }
}

async function finish(session: Session): Promise<Uint8Array> {
  return session.pdf.save();
}

export async function pdfCard(measurer: Measurer, design: Design, card: CardDef, deck: Deck, face: FaceId, cut = false) {
  const values = faceValues(design, deck, card, face, usesCutArt(design, cut));
  if (!values) throw new Error("У этой стороны нет макета");
  const session = await openSession(measurer);
  await addCard(session, shownDesign(design, cut), face, values);
  return finish(session);
}

export async function pdfSheet(
  measurer: Measurer,
  design: Design,
  deck: Deck,
  sheet: SheetFormat,
  sheetIndex: number,
  face: FaceId,
  cut = false,
) {
  const session = await openSession(measurer);
  await addSheet(session, design, deck, sheet, sheetIndex, face, cut);
  return finish(session);
}

export async function pdfAllCards(measurer: Measurer, design: Design, deck: Deck, cut = false) {
  const shown = shownDesign(design, cut);
  const art = usesCutArt(design, cut);
  const session = await openSession(measurer);
  for (const card of deck.cards) {
    if (card.count < 1 || (art && !card.cut)) continue;
    const front = faceValues(design, deck, card, "front", art);
    if (front) await addCard(session, shown, "front", front);
    const ownBack = design.backMode === "per-card" || isDoubleSided(design, card.typeId);
    if (ownBack) {
      const back = faceValues(design, deck, card, "back", art);
      if (back) await addCard(session, shown, "back", back);
    }
  }
  if (design.backMode === "shared") {
    const seen = new Set<string>();
    for (const card of deck.cards) {
      if (card.count < 1 || seen.has(card.typeId) || isDoubleSided(design, card.typeId)) continue;
      if (art && !card.cut) continue;
      seen.add(card.typeId);
      const back = faceValues(design, deck, card, "back", art);
      if (back) await addCard(session, shown, "back", back);
    }
  }
  return finish(session);
}

export async function pdfAllSheets(measurer: Measurer, design: Design, deck: Deck, sheet: SheetFormat, cut = false) {
  const session = await openSession(measurer);
  const typeIds = design.types.map((type) => type.id);
  const cutIds = design.types.filter((type) => (type.cutBleed ?? 0) > 0).map((type) => type.id);
  const cutSet = new Set(cutIds);
  const plainIds = typeIds.filter((id) => !cutSet.has(id));
  const art = usesCutArt(design, cut);
  const groups = art
    ? [
        { cards: cardsForSheets(cutIds, deck.cards.filter((card) => cutSet.has(card.typeId))), cut: true },
        { cards: cardsForSheets(plainIds, deck.cards.filter((card) => !cutSet.has(card.typeId))), cut: false },
      ]
    : [{ cards: cardsForSheets(typeIds, deck.cards), cut }];
  for (const group of groups) {
    if (group.cards.length === 0) continue;
    const packed: Deck = { ...deck, cards: group.cards };
    const shown = shownDesign(design, group.cut);
    const grid = gridFor(shown.trim, shown.bleed, sheet, sheetMargin(shown.bleed));
    const total = sheetCount(expandCounts(packed.cards).length, grid.cols, grid.rows);
    for (let index = 0; index < total; index += 1) {
      await addSheet(session, design, packed, sheet, index, "front", group.cut);
      if (design.backMode !== "none") await addSheet(session, design, packed, sheet, index, "back", group.cut);
    }
  }
  return finish(session);
}

export function saveFile(bytes: Uint8Array, filename: string) {
  const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function cardFileName(deckId: string, card: CardDef): string {
  return `${deckId}-${card.id}-x${card.count}.pdf`;
}
