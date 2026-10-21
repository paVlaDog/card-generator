import type { Deck } from "../../model/types";

export const resArcanaArtifacts: Deck = {
  id: "artifacts",
  designId: "res-arcana",
  title: "Основная",
  backs: { artifacts: { label: "АРТЕФАКТЫ" } },
  cards: [
    {
      id: "moth",
      typeId: "artifacts",
      title: "Серебряная моль",
      count: 1,
      front: {
        art: "assets/res-arcana/moth.png",
        title: "Серебряная моль",
        cost: "покой",
        kind: "Существо",
        points: "1",
        rules: "Получение: 1 пыл.\nПоверните: возьмите 1 покой.",
      },
    },
    {
      id: "kiln",
      typeId: "artifacts",
      title: "Печь зари",
      count: 1,
      front: {
        art: "assets/res-arcana/kiln.png",
        title: "Печь зари",
        cost: "пыл золото",
        kind: "Артефакт",
        points: "1",
        rules: "Сбросьте 2 одинаковые эссенции, кроме золота: возьмите 1 золото.",
      },
    },
    {
      id: "dragon",
      typeId: "artifacts",
      title: "Стеклянный дракон",
      count: 1,
      front: {
        art: "assets/res-arcana/dragon.png",
        title: "Стеклянный дракон",
        cost: "пыл жизнь покой",
        kind: "Дракон",
        points: "2",
        rules: "Поверните: соперник теряет 2 жизни, если не сбросит 1 золото.",
      },
    },
  ],
};
