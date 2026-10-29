import { describe, expect, it } from "vitest";
import { cardsOfType, faceValues, type CardDef, type CardType, type Deck, type Design } from "./types";

const design = {
  backMode: "shared",
  types: [
    { id: "artifacts", title: "Артефакты" },
    { id: "scrolls", title: "Свитки" },
    { id: "hints", title: "Подсказки", doubleSided: true },
  ] as CardType[],
} as Design;

function card(typeId: string): CardDef {
  return { id: typeId, typeId, title: typeId, count: 1, front: { title: typeId } };
}

describe("card types", () => {
  const deck: Deck = {
    id: "main",
    designId: "res-arcana",
    title: "Основная",
    backs: { artifacts: { label: "АРТЕФАКТЫ" } },
    cards: [card("artifacts"), card("scrolls")],
  };

  it("keeps each type's cards and only the back that exists", () => {
    expect(cardsOfType(deck, "artifacts")).toHaveLength(1);
    expect(cardsOfType(deck, "monuments")).toHaveLength(0);
    expect(faceValues(design, deck, deck.cards[0], "back")).toEqual({ label: "АРТЕФАКТЫ" });
    expect(faceValues(design, deck, deck.cards[1], "back")).toBeNull();
    expect(faceValues(design, deck, deck.cards[1], "front")).toEqual({ title: "scrolls" });
  });

  it("uses each card's own back when the type is double-sided", () => {
    const hint: CardDef = {
      id: "likbez",
      typeId: "hints",
      title: "Ликбез",
      count: 1,
      front: { art: "front.png" },
      back: { art: "back.png" },
    };
    const bare: CardDef = { ...hint, id: "empty", back: undefined };
    const withShirt: Deck = { ...deck, backs: { ...deck.backs, hints: { art: "shirt.png" } }, cards: [hint, bare] };
    expect(faceValues(design, withShirt, hint, "back")).toEqual({ art: "back.png" });
    expect(faceValues(design, withShirt, bare, "back")).toBeNull();
    expect(faceValues(design, withShirt, hint, "front")).toEqual({ art: "front.png" });
  });

  it("reads the stored cut copy and its shared back", () => {
    const person: CardDef = {
      id: "hero",
      typeId: "artifacts",
      title: "Герой",
      count: 1,
      front: { art: "plain.png" },
      cut: { art: "bleed.png" },
    };
    const cutting: Deck = {
      ...deck,
      cutBacks: { artifacts: { art: "shirt-bleed.png" } },
      cards: [person],
    };
    expect(faceValues(design, cutting, person, "front", true)).toEqual({ art: "bleed.png" });
    expect(faceValues(design, cutting, person, "back", true)).toEqual({ art: "shirt-bleed.png" });
    expect(faceValues(design, cutting, { ...person, cut: undefined }, "front", true)).toBeNull();
    expect(faceValues(design, cutting, person, "front")).toEqual({ art: "plain.png" });
  });

  it("reads both faces of a double-sided cut copy", () => {
    const hint: CardDef = {
      id: "rules",
      typeId: "hints",
      title: "Правила",
      count: 1,
      front: { art: "front.png" },
      back: { art: "back.png" },
      cut: { art: "front-bleed.png" },
      cutBack: { art: "back-bleed.png" },
    };
    expect(faceValues(design, deck, hint, "front", true)).toEqual({ art: "front-bleed.png" });
    expect(faceValues(design, deck, hint, "back", true)).toEqual({ art: "back-bleed.png" });
    expect(faceValues(design, deck, hint, "back")).toEqual({ art: "back.png" });
    expect(faceValues(design, deck, { ...hint, cutBack: undefined }, "back", true)).toBeNull();
  });
});
