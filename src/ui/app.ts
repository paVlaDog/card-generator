import { decksFor, designs, findDeck, findDesign } from "../designs";
import { cardsOfType, faceValues, showsBack, type Deck, type Design, type FaceId, type Measurer } from "../model/types";
import { expandCounts, placements, sheetCount } from "../print/impose";
import { gridFor, SHEETS, sheetById, type SheetFormat } from "../print/spec";
import { cardSvg, sheetSvg } from "../render/svg";
import { installFaces, loadMeasurer } from "../render/fonts";
import { cardFileName, pdfAllCards, pdfAllSheets, pdfCard, pdfSheet, saveFile } from "../render/pdf";
import { deckHref, designHref, homeHref, parseHash, type Route } from "./router";

type Mode = "cards" | "sheets";

type State = {
  cardIndex: number;
  sheetIndex: number;
  face: FaceId;
  sheetId: SheetFormat["id"];
  busy: string | null;
  error: string | null;
  deckKey: string | null;
  typeId: string | null;
};

const state: State = {
  cardIndex: 0,
  sheetIndex: 0,
  face: "front",
  sheetId: "sra3",
  busy: null,
  error: null,
  deckKey: null,
  typeId: null,
};

let app: HTMLElement;
let measurer: Measurer;
let renderToken = 0;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function plural(count: number, one: string, few: string, many: string): string {
  const n10 = count % 10;
  const n100 = count % 100;
  if (n10 === 1 && n100 !== 11) return `${count} ${one}`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `${count} ${few}`;
  return `${count} ${many}`;
}

function copiesOf(deck: Deck): number {
  return deck.cards.reduce((sum, card) => sum + card.count, 0);
}

function deckMeta(design: Design, deck: Deck): string {
  const bits = [
    plural(deck.cards.length, "карта", "карты", "карт"),
    plural(copiesOf(deck), "экземпляр", "экземпляра", "экземпляров"),
  ];
  if (design.types.length > 1) bits.push(plural(design.types.length, "тип", "типа", "типов"));
  return bits.join(" · ");
}

function activeType(design: Design): string {
  if (state.typeId && design.types.some((type) => type.id === state.typeId)) return state.typeId;
  return design.types[0].id;
}

function scopeDeck(deck: Deck, typeId: string): Deck {
  return { ...deck, cards: cardsOfType(deck, typeId) };
}

function logo(): HTMLImageElement {
  const img = h("img", "logo");
  img.src = `${import.meta.env.BASE_URL}favicon.svg`;
  img.alt = "";
  img.width = 28;
  img.height = 28;
  return img;
}

function syncDeck(route: Route) {
  const key = route.name === "deck" ? `${route.designId}/${route.deckId}` : null;
  if (key === state.deckKey) return;
  state.deckKey = key;
  state.cardIndex = 0;
  state.sheetIndex = 0;
  state.face = "front";
  state.typeId = null;
  state.error = null;
}

function sheetOf(): SheetFormat {
  return sheetById(state.sheetId);
}

async function render() {
  const token = ++renderToken;
  const route = parseHash(location.hash);
  syncDeck(route);
  const node = await view(route);
  if (token !== renderToken) return;
  app.replaceChildren(node);
}

async function view(route: Route): Promise<HTMLElement> {
  if (route.name === "deck") return deckView(route.designId, route.deckId, route.mode);
  const page = await homeView();
  if (route.name === "design") {
    const design = findDesign(route.designId);
    page.append(design ? dialog(design) : missing("Такого дизайна нет."));
  }
  return page;
}

async function homeView(): Promise<HTMLElement> {
  const page = h("div", "page");
  const top = h("div", "top");
  const brand = h("div", "brand");
  brand.append(logo(), h("h1", "", "Хранилище настолок"));
  top.append(brand);
  page.append(top, h("p", "lead", "Склад карт с удобным разбиением на листы для печати."));
  const grid = h("div", "designs");
  for (const design of designs) {
    const link = h("a", "design");
    link.href = designHref(design.id);
    const frame = h("div", "preview");
    const deck = decksFor(design.id)[0];
    if (deck) frame.append(await cardSvg(design, "front", deck.cards[0].front, measurer));
    const copy = h("div");
    copy.append(h("h2", "", design.title), h("p", "", design.description));
    const bits = [plural(decksFor(design.id).length, "колода", "колоды", "колод")];
    if (design.types.length > 1) bits.push(plural(design.types.length, "тип", "типа", "типов"));
    copy.append(h("p", "meta", bits.join(" · ")));
    link.append(frame, copy);
    grid.append(link);
  }
  page.append(grid);
  return page;
}

function dialog(design: Design): HTMLElement {
  const overlay = h("div", "overlay");
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) location.hash = homeHref();
  });
  const panel = h("div", "dialog");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "deck-dialog-title");
  const title = h("h2", "", design.title);
  title.id = "deck-dialog-title";
  panel.append(title, h("p", "quiet", "Готовые колоды"));
  const list = h("div", "deck-list");
  const rows = decksFor(design.id);
  if (rows.length === 0) list.append(h("p", "", "Пока нет ни одной колоды."));
  for (const deck of rows) {
    const link = h("a", "deck-row");
    link.href = deckHref(design.id, deck.id);
    link.append(
      h("span", "deck-name", deck.title),
      h("span", "meta", deckMeta(design, deck)),
    );
    list.append(link);
  }
  const fresh = h("button", "wide", "Новая колода");
  fresh.type = "button";
  fresh.disabled = true;
  fresh.title = "Пока недоступно";
  const close = h("a", "text-link", "Закрыть");
  close.href = homeHref();
  const footer = h("div", "dialog-footer");
  footer.append(fresh, close);
  panel.append(list, footer);
  overlay.append(panel);
  return overlay;
}

function missing(text: string): HTMLElement {
  const page = h("div", "page");
  page.append(h("p", "lead", text));
  const back = h("a", "crumb", "К дизайнам");
  back.href = homeHref();
  page.append(back);
  return page;
}

async function deckView(designId: string, deckId: string, mode: Mode): Promise<HTMLElement> {
  const design = findDesign(designId);
  const deck = findDeck(designId, deckId);
  if (!design || !deck) return missing("Такой колоды нет.");
  const typeId = activeType(design);
  state.typeId = typeId;
  const scope = scopeDeck(deck, typeId);
  const showBack = showsBack(design, deck, typeId);
  if (!showBack) state.face = "front";
  const sheet = sheetOf();
  const grid = gridFor(design.trim, design.bleed, sheet);
  const expanded = expandCounts(scope.cards);
  const sheets = sheetCount(expanded.length, grid.cols, grid.rows);
  state.cardIndex = Math.min(state.cardIndex, Math.max(0, scope.cards.length - 1));
  state.sheetIndex = Math.min(state.sheetIndex, Math.max(0, sheets - 1));

  const page = h("div", "page");
  const top = h("div", "top");
  const back = h("a", "crumb", "К дизайнам");
  back.href = homeHref();
  const heading = h("div", "title-block");
  heading.append(h("h1", "", deck.title), h("p", "", design.title));
  top.append(back, heading);
  page.append(top);

  const tools = h("div", "toolbar");
  if (design.types.length > 1) {
    tools.append(buttonPair(
      design.types.map((type) => [type.id, type.title]),
      typeId,
      (value) => {
        state.typeId = value;
        state.cardIndex = 0;
        state.sheetIndex = 0;
        state.face = "front";
      },
    ));
  }
  tools.append(segment(
    [
      ["cards", "Карты", deckHref(designId, deckId, "cards")],
      ["sheets", "Листы", deckHref(designId, deckId, "sheets")],
    ],
    mode,
  ));
  if (showBack) {
    tools.append(buttonPair(
      [
        ["front", "Лицо"],
        ["back", "Оборот"],
      ],
      state.face,
      (value) => {
        state.face = value as FaceId;
      },
    ));
  }
  const format = h("select");
  format.id = "sheet-format";
  format.setAttribute("aria-label", "Формат листа");
  for (const item of SHEETS) {
    const option = h("option", "", item.title);
    option.value = item.id;
    option.selected = item.id === state.sheetId;
    format.append(option);
  }
  format.addEventListener("change", () => {
    state.sheetId = format.value as SheetFormat["id"];
    state.sheetIndex = 0;
    void render();
  });
  tools.append(format);

  if (mode === "cards") {
    tools.append(pager(state.cardIndex, scope.cards.length, "Карта", () => {
      state.cardIndex -= 1;
    }, () => {
      state.cardIndex += 1;
    }));
    const shown = scope.cards[state.cardIndex];
    if (shown) tools.append(countField(shown));
  } else {
    tools.append(pager(state.sheetIndex, sheets, "Лист", () => {
      state.sheetIndex -= 1;
    }, () => {
      state.sheetIndex += 1;
    }));
  }
  page.append(tools);

  const downloads = h("div", "downloads");
  const ready = scope.cards.length > 0 ? undefined : "disabled";
  downloads.append(
    action("Скачать карту", () => downloadCard(design, scope), ready ?? "primary"),
    action("Скачать лист", () => downloadSheet(design, scope), sheets ? "primary" : "disabled"),
    action("Все карты", () => downloadAllCards(design, scope), ready),
    action("Все листы", () => downloadAllSheets(design, scope), sheets ? undefined : "disabled"),
  );
  if (state.busy) downloads.append(h("span", "status", state.busy));
  page.append(downloads);

  const stage = h("div", `stage ${mode}`);
  if (scope.cards.length === 0) {
    const typeTitle = design.types.find((type) => type.id === typeId)?.title ?? "этом типе";
    stage.append(h("p", "", `В типе «${typeTitle}» пока нет карт.`));
    page.append(stage);
  } else if (mode === "cards") {
    const card = scope.cards[state.cardIndex];
    const values = faceValues(design, scope, card, state.face);
    if (!values) {
      stage.append(h("p", "", "У этой карты ещё нет своего оборота."));
    } else {
      stage.append(await cardSvg(design, state.face, values, measurer));
    }
    const side = state.face === "back" ? "Оборот" : "Лицо";
    page.append(stage, h("p", "caption", `${card.title} · ${side} · ×${card.count}. Красная линия — рез, поле вокруг неё — вылет ${design.bleed} мм. В PDF вместо линии стоят метки.`));
  } else if (grid.cols === 0 || grid.rows === 0) {
    stage.append(h("p", "", "Карта не помещается на этот лист с полем 12 мм."));
    page.append(stage);
  } else if (!sheets) {
    stage.append(h("p", "", "В колоде нет экземпляров для печати."));
    page.append(stage);
  } else {
    const placed = placements(expanded.length, grid.cols, grid.rows, state.sheetIndex, state.face).flatMap((item) => {
      const values = faceValues(design, scope, expanded[item.cardIndex], state.face);
      return values ? [{ col: item.col, row: item.row, values }] : [];
    });
    stage.append(await sheetSvg(design, measurer, grid, sheet, placed, state.face, state.sheetIndex, sheets));
    page.append(stage, h("p", "caption", "Красная рамка только на экране и показывает рез. В PDF остаются чёрные метки в поле листа. Пустые ячейки держат ту же сетку."));
  }
  if (state.error) page.append(h("p", "status", state.error));
  return page;
}

function segment(items: Array<[Mode, string, string]>, current: Mode): HTMLElement {
  const wrap = h("div", "segment");
  for (const [id, label, href] of items) {
    const link = h("a", id === current ? "pressed" : "", label);
    link.href = href;
    wrap.append(link);
  }
  return wrap;
}

function buttonPair(items: Array<[string, string]>, current: string, choose: (value: string) => void): HTMLElement {
  const wrap = h("div", "segment");
  for (const [id, label] of items) {
    const button = h("button", id === current ? "pressed" : "", label);
    button.type = "button";
    button.addEventListener("click", () => {
      choose(id);
      void render();
    });
    wrap.append(button);
  }
  return wrap;
}

function countField(card: { title: string; count: number }): HTMLElement {
  const label = h("label", "count");
  label.append(h("span", "", "В колоде"));
  const input = h("input");
  input.type = "number";
  input.min = "0";
  input.max = "99";
  input.step = "1";
  input.value = String(card.count);
  input.setAttribute("aria-label", `Количество «${card.title}» в колоде`);
  input.addEventListener("change", () => {
    const next = Math.round(Number(input.value));
    card.count = Number.isFinite(next) ? Math.min(99, Math.max(0, next)) : card.count;
    void render();
  });
  label.append(input);
  return label;
}

function pager(index: number, total: number, label: string, prev: () => void, next: () => void): HTMLElement {
  const wrap = h("div", "pager");
  const back = h("button", "", "←");
  back.type = "button";
  back.disabled = index <= 0;
  back.setAttribute("aria-label", "Назад");
  back.addEventListener("click", () => {
    prev();
    void render();
  });
  const forward = h("button", "", "→");
  forward.type = "button";
  forward.disabled = index >= total - 1;
  forward.setAttribute("aria-label", "Дальше");
  forward.addEventListener("click", () => {
    next();
    void render();
  });
  wrap.append(back, h("span", "", total ? `${label} ${index + 1} из ${total}` : label), forward);
  return wrap;
}

function action(label: string, run: () => void, kind?: string): HTMLButtonElement {
  const button = h("button", kind === "primary" ? "primary" : "", label);
  button.type = "button";
  button.disabled = Boolean(state.busy) || kind === "disabled";
  button.addEventListener("click", run);
  return button;
}

async function downloadCard(design: Design, deck: Deck) {
  const card = deck.cards[state.cardIndex];
  if (!card) return;
  await run("Собираю PDF карты…", cardFileName(deck.id, card), () => pdfCard(measurer, design, card, deck, state.face));
}

async function downloadSheet(design: Design, deck: Deck) {
  const sheet = sheetOf();
  const side = state.face === "front" ? "lico" : "oborot";
  await run("Собираю PDF листа…", `${fileStem(design, deck)}-${sheet.id}-${state.sheetIndex + 1}-${side}.pdf`, () =>
    pdfSheet(measurer, design, deck, sheet, state.sheetIndex, state.face),
  );
}

async function downloadAllCards(design: Design, deck: Deck) {
  await run("Собираю PDF всех карт…", `${fileStem(design, deck)}-karty.pdf`, () => pdfAllCards(measurer, design, deck));
}

async function downloadAllSheets(design: Design, deck: Deck) {
  const sheet = sheetOf();
  await run("Собираю PDF всех листов…", `${fileStem(design, deck)}-listy-${sheet.id}.pdf`, () => pdfAllSheets(measurer, design, deck, sheet));
}

function fileStem(design: Design, deck: Deck): string {
  const typeId = deck.cards[0]?.typeId;
  if (design.types.length > 1 && typeId) return `${deck.id}-${typeId}`;
  return deck.id;
}

async function run(label: string, filename: string, build: () => Promise<Uint8Array>) {
  if (state.busy) return;
  state.busy = label;
  state.error = null;
  await render();
  try {
    saveFile(await build(), filename);
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Не удалось собрать PDF";
  } finally {
    state.busy = null;
    await render();
  }
}

function onKey(event: KeyboardEvent) {
  const route = parseHash(location.hash);
  if (event.key === "Escape" && route.name === "design") {
    location.hash = homeHref();
    return;
  }
  if (route.name !== "deck") return;
  if (
    event.target instanceof HTMLInputElement
    || event.target instanceof HTMLTextAreaElement
    || event.target instanceof HTMLSelectElement
  ) return;
  const design = findDesign(route.designId);
  const deck = findDeck(route.designId, route.deckId);
  if (!design || !deck) return;
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  const step = event.key === "ArrowRight" ? 1 : -1;
  if (route.mode === "cards") state.cardIndex += step;
  else state.sheetIndex += step;
  void render();
}

export async function start(root: HTMLElement) {
  app = root;
  app.append(h("p", "lead", "Загружаю шрифты…"));
  await installFaces();
  measurer = await loadMeasurer();
  window.addEventListener("hashchange", () => void render());
  window.addEventListener("keydown", onKey);
  await render();
}
