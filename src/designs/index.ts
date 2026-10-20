import { arcane } from "./arcane/design";
import { arcaneRelics } from "./arcane/deck";
import { playingSample } from "./playing-card/deck";
import { playingCard } from "./playing-card/design";
import { halloweenDeeds } from "./portal/deck";
import { portal } from "./portal/design";
import type { Deck, Design } from "../model/types";

export const designs: Design[] = [portal, arcane, playingCard];
export const decks: Deck[] = [halloweenDeeds, arcaneRelics, playingSample];

export function findDesign(id: string): Design | undefined {
  return designs.find((design) => design.id === id);
}

export function findDeck(designId: string, deckId: string): Deck | undefined {
  return decks.find((deck) => deck.designId === designId && deck.id === deckId);
}

export function decksFor(designId: string): Deck[] {
  return decks.filter((deck) => deck.designId === designId);
}
