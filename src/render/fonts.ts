import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont } from "pdf-lib";
import type { FontId, Measurer } from "../model/types";
import { assetUrl, MM_TO_PT } from "./geometry";

const FILES: Record<FontId, string> = {
  serif: "fonts/PTSerif-Regular.ttf",
  serifBold: "fonts/PTSerif-Bold.ttf",
  sans: "fonts/PTSans-Regular.ttf",
  sansBold: "fonts/PTSans-Bold.ttf",
};

const cache = new Map<FontId, Promise<ArrayBuffer>>();

function loadBytes(id: FontId): Promise<ArrayBuffer> {
  let pending = cache.get(id);
  if (!pending) {
    pending = fetch(assetUrl(FILES[id])).then((response) => {
      if (!response.ok) throw new Error(`Не удалось загрузить шрифт ${FILES[id]}`);
      return response.arrayBuffer();
    });
    cache.set(id, pending);
  }
  return pending;
}

async function embedAll(pdf: PDFDocument): Promise<Record<FontId, PDFFont>> {
  pdf.registerFontkit(fontkit);
  const fonts = {} as Record<FontId, PDFFont>;
  for (const id of Object.keys(FILES) as FontId[]) {
    fonts[id] = await pdf.embedFont(await loadBytes(id));
  }
  return fonts;
}

export async function loadMeasurer(): Promise<Measurer> {
  const pdf = await PDFDocument.create();
  const fonts = await embedAll(pdf);
  return {
    width(text, font, sizePt) {
      if (!text) return 0;
      return fonts[font].widthOfTextAtSize(text, sizePt) / MM_TO_PT;
    },
  };
}

export async function embedFonts(pdf: PDFDocument): Promise<Record<FontId, PDFFont>> {
  return embedAll(pdf);
}

export async function installFaces(): Promise<void> {
  const css = (Object.keys(FILES) as FontId[])
    .map((id) => {
      const family = id.startsWith("serif") ? "PT Serif" : "PT Sans";
      const weight = id.endsWith("Bold") ? 700 : 400;
      return `@font-face{font-family:"${family}";src:url("${assetUrl(FILES[id])}") format("truetype");font-weight:${weight};font-style:normal;font-display:block;}`;
    })
    .join("");
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  await Promise.all([
    document.fonts.load('16px "PT Serif"'),
    document.fonts.load('700 16px "PT Serif"'),
    document.fonts.load('16px "PT Sans"'),
    document.fonts.load('700 16px "PT Sans"'),
  ]);
  await document.fonts.ready;
}
