export type Route =
  | { name: "home" }
  | { name: "design"; designId: string }
  | { name: "deck"; designId: string; deckId: string; mode: "cards" | "sheets" };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] !== "d" || !parts[1]) return { name: "home" };
  if (!parts[2]) return { name: "design", designId: decodeURIComponent(parts[1]) };
  return {
    name: "deck",
    designId: decodeURIComponent(parts[1]),
    deckId: decodeURIComponent(parts[2]),
    mode: parts[3] === "sheets" ? "sheets" : "cards",
  };
}

export function homeHref(): string {
  return "#/";
}

export function designHref(designId: string): string {
  return `#/d/${encodeURIComponent(designId)}`;
}

export function deckHref(designId: string, deckId: string, mode: "cards" | "sheets" = "cards"): string {
  const base = `#/d/${encodeURIComponent(designId)}/${encodeURIComponent(deckId)}`;
  return mode === "sheets" ? `${base}/sheets` : base;
}
