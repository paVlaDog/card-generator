import { describe, expect, it } from "vitest";
import { cardsOfType, faceValues, type CardDef, type Deck, type Design } from "./types";

const design = { backMode: "shared" } as Design;

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
});
