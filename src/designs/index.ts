import { arcane } from "./arcane/design";
import { arcaneRelics } from "./arcane/deck";
import { centuryDeck } from "./century/deck";
import { century } from "./century/design";
import { playingSample } from "./playing-card/deck";
import { playingCard } from "./playing-card/design";
import { halloweenDeeds } from "./portal/deck";
import { portal } from "./portal/design";
import { resArcanaArtifacts } from "./res-arcana/deck";
import { resArcana } from "./res-arcana/design";
import type { Deck, Design } from "../model/types";

export const designs: Design[] = [resArcana, portal, arcane, playingCard, century];
export const decks: Deck[] = [resArcanaArtifacts, halloweenDeeds, arcaneRelics, playingSample, centuryDeck];

export function findDesign(id: string): Design | undefined {
  return designs.find((design) => design.id === id);
}

export function findDeck(designId: string, deckId: string): Deck | undefined {
  return decks.find((deck) => deck.designId === designId && deck.id === deckId);
}

export function decksFor(designId: string): Deck[] {
  return decks.filter((deck) => deck.designId === designId);
}
