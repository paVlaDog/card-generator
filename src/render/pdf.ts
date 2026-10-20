import fontkit from "@pdf-lib/fontkit";
import {
  clip,
  closePath,
  degrees,
  endPath,
  lineTo,
  moveTo,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { faceValues, type CardDef, type Design, type Deck, type DrawOp, type FaceId, type FontId, type Measurer } from "../model/types";
import { expandCounts, placements, sheetCount } from "../print/impose";
import { cardPage, cellTrim, cropMarks, gridFor, sheetLabel, type Mark, type SheetFormat } from "../print/spec";
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

async function paintOps(session: Session, page: PDFPage, ops: DrawOp[], originX: number, originY: number) {
  const pageH = page.getHeight();
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
      } else {
        const d =
          op.points
            .map((point, index) => {
              const x = (originX + point[0]) * MM_TO_PT;
              const y = pageH - (originY + point[1]) * MM_TO_PT;
              return `${index === 0 ? "M" : "L"}${x.toFixed(3)},${y.toFixed(3)}`;
            })
            .join(" ") + (op.t === "polygon" ? " Z" : "");
        page.drawSvgPath(d, { x: 0, y: 0, color: fill, borderColor: stroke, borderWidth: sw });
      }
    } else if (op.t === "text") {
      page.drawText(op.text, {
        x: (originX + op.x) * MM_TO_PT,
        y: pageH - (originY + op.y) * MM_TO_PT,
        size: op.size,
        font: session.fonts[op.font],
        color: colorOf(op.color),
        rotate: op.rotate ? degrees(-op.rotate) : undefined,
      });
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
  await paintOps(
    session,
    page,
    renderOps(design, face, values, session.measurer),
    pageBox.firstTrimX - design.bleed,
    pageBox.firstTrimY - design.bleed,
  );
  paintMarks(page, cropMarks(pageBox));
}

async function addSheet(
  session: Session,
  design: Design,
  deck: Deck,
  sheet: SheetFormat,
  sheetIndex: number,
  face: FaceId,
) {
  const grid = gridFor(design.trim, design.bleed, sheet);
  const expanded = expandCounts(deck.cards);
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
    const values = faceValues(design, deck, card, face);
    if (!values) continue;
    const trim = cellTrim(grid, item.col, item.row);
    await paintOps(
      session,
      page,
      renderOps(design, face, values, session.measurer),
      trim.x - design.bleed,
      trim.y - design.bleed,
    );
  }
  paintMarks(page, cropMarks(grid));
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

export async function pdfCard(measurer: Measurer, design: Design, card: CardDef, deck: Deck, face: FaceId) {
  const values = faceValues(design, deck, card, face);
  if (!values) throw new Error("У этой стороны нет макета");
  const session = await openSession(measurer);
  await addCard(session, design, face, values);
  return finish(session);
}

export async function pdfSheet(
  measurer: Measurer,
  design: Design,
  deck: Deck,
  sheet: SheetFormat,
  sheetIndex: number,
  face: FaceId,
) {
  const session = await openSession(measurer);
  await addSheet(session, design, deck, sheet, sheetIndex, face);
  return finish(session);
}

export async function pdfAllCards(measurer: Measurer, design: Design, deck: Deck) {
  const session = await openSession(measurer);
  for (const card of deck.cards) {
    await addCard(session, design, "front", card.front);
    if (design.backMode === "per-card" && card.back) await addCard(session, design, "back", card.back);
  }
  if (design.backMode === "shared" && deck.back) await addCard(session, design, "back", deck.back);
  return finish(session);
}

export async function pdfAllSheets(measurer: Measurer, design: Design, deck: Deck, sheet: SheetFormat) {
  const grid = gridFor(design.trim, design.bleed, sheet);
  const total = sheetCount(expandCounts(deck.cards).length, grid.cols, grid.rows);
  const session = await openSession(measurer);
  for (let index = 0; index < total; index += 1) {
    await addSheet(session, design, deck, sheet, index, "front");
    if (design.backMode !== "none") await addSheet(session, design, deck, sheet, index, "back");
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
