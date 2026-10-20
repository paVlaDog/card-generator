import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decks, designs } from "../src/designs/index.ts";
import type { FieldSpec } from "../src/model/types.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors: string[] = [];

function fail(message: string) {
  errors.push(message);
}

function lengthOf(value: string): number {
  return [...value].length;
}

function checkFields(scope: string, fields: FieldSpec[], values: Record<string, string> | undefined) {
  const data = values ?? {};
  const known = new Set(fields.map((field) => field.id));
  for (const field of fields) {
    const value = data[field.id] ?? "";
    if (field.required && !value.trim()) fail(`${scope}: пустое поле «${field.name}»`);
    if (field.kind === "text" && field.maxLength && lengthOf(value) > field.maxLength) {
      fail(`${scope}: «${field.name}» длиннее ${field.maxLength}`);
    }
    if (field.kind === "image" && value.trim()) {
      const file = path.join(root, "public", ...value.split("/"));
      if (!fs.existsSync(file)) fail(`${scope}: нет файла ${value}`);
    }
  }
  for (const key of Object.keys(data)) {
    if (!known.has(key)) fail(`${scope}: неизвестное поле ${key}`);
  }
}

const designIds = new Set<string>();
for (const design of designs) {
  if (designIds.has(design.id)) fail(`дизайн ${design.id} повторяется`);
  designIds.add(design.id);
  if (design.backMode === "none" && design.fields.back.length > 0) {
    fail(`${design.id}: у одностороннего дизайна заданы поля рубашки`);
  }
}

const deckIds = new Set<string>();
for (const deck of decks) {
  const key = `${deck.designId}/${deck.id}`;
  if (deckIds.has(key)) fail(`колода ${key} повторяется`);
  deckIds.add(key);
  const design = designs.find((item) => item.id === deck.designId);
  if (!design) {
    fail(`${key}: неизвестный дизайн`);
    continue;
  }
  if (design.backMode === "shared") checkFields(`${key} рубашка`, design.fields.back, deck.back);
  if (design.backMode !== "shared" && deck.back) fail(`${key}: общая рубашка не предусмотрена дизайном`);
  const cardIds = new Set<string>();
  if (deck.cards.length === 0) fail(`${key}: в колоде нет карт`);
  for (const card of deck.cards) {
    if (cardIds.has(card.id)) fail(`${key}: карта ${card.id} повторяется`);
    cardIds.add(card.id);
    if (!Number.isInteger(card.count) || card.count < 1) fail(`${key}/${card.id}: тираж должен быть целым числом от 1`);
    checkFields(`${key}/${card.id}`, design.fields.front, card.front);
    if (design.backMode === "per-card") checkFields(`${key}/${card.id} оборот`, design.fields.back, card.back);
    if (design.backMode !== "per-card" && card.back) fail(`${key}/${card.id}: свой оборот не предусмотрен`);
  }
}

const fonts = ["PTSerif-Regular.ttf", "PTSerif-Bold.ttf", "PTSans-Regular.ttf", "PTSans-Bold.ttf"];
for (const font of fonts) {
  const file = path.join(root, "public", "fonts", font);
  if (!fs.existsSync(file) || fs.statSync(file).size < 10_000) fail(`нет шрифта ${font}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`ok: ${designs.length} дизайна, ${decks.length} колоды`);
