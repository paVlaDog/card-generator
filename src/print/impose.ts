export type Placed = { cardIndex: number; col: number; row: number };

export function expandCounts<T extends { count: number }>(cards: T[]): T[] {
  const out: T[] = [];
  for (const card of cards) {
    for (let copy = 0; copy < card.count; copy += 1) out.push(card);
  }
  return out;
}

export function sheetCount(total: number, cols: number, rows: number): number {
  const per = cols * rows;
  if (per <= 0 || total <= 0) return 0;
  return Math.ceil(total / per);
}

/**
 * Back pages are mirrored across the long edge: for a portrait sheet the
 * columns reverse and the rows stay. Duplex printers flip this way by default.
 */
export function placements(
  total: number,
  cols: number,
  rows: number,
  sheetIndex: number,
  face: "front" | "back",
): Placed[] {
  const per = cols * rows;
  if (per <= 0) return [];
  const start = sheetIndex * per;
  const placed: Placed[] = [];
  for (let slot = 0; slot < per; slot += 1) {
    const cardIndex = start + slot;
    if (cardIndex >= total) break;
    const row = Math.floor(slot / cols);
    const col = slot % cols;
    placed.push({ cardIndex, col: face === "back" ? cols - 1 - col : col, row });
  }
  return placed;
}
