import { describe, expect, it } from "vitest";
import { deckHref, parseHash } from "./router";

describe("router", () => {
  it("reads the design dialog, the deck and the sheet mode from the hash", () => {
    expect(parseHash("")).toEqual({ name: "home" });
    expect(parseHash("#/d/arcane")).toEqual({ name: "design", designId: "arcane" });
    expect(parseHash("#/d/arcane/relics")).toMatchObject({ name: "deck", mode: "cards" });
    expect(parseHash("#/d/arcane/relics/sheets")).toMatchObject({ mode: "sheets" });
    expect(parseHash(deckHref("playing-card", "sample", "sheets"))).toEqual({
      name: "deck",
      designId: "playing-card",
      deckId: "sample",
      mode: "sheets",
    });
  });
});
