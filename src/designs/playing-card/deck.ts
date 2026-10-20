import type { Deck } from "../../model/types";

export const playingSample: Deck = {
  id: "sample",
  designId: "playing-card",
  title: "Пробная колода",
  back: { label: "ПРОБА" },
  cards: ([
    ["as", "A♠", "A", "♠", 2],
    ["kh", "K♥", "K", "♥", 2],
    ["qd", "Q♦", "Q", "♦", 2],
    ["jc", "J♣", "J", "♣", 2],
    ["10s", "10♠", "10", "♠", 2],
    ["9h", "9♥", "9", "♥", 1],
    ["7d", "7♦", "7", "♦", 2],
    ["5c", "5♣", "5", "♣", 2],
    ["3s", "3♠", "3", "♠", 2],
    ["2h", "2♥", "2", "♥", 1],
  ] as Array<[string, string, string, string, number]>).map(([id, title, rank, suit, count]) => ({
    id,
    title,
    count: Number(count),
    front: { rank, suit },
  })),
};
