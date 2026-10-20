import type { Deck } from "../../model/types";

export const arcaneRelics: Deck = {
  id: "relics",
  designId: "arcane",
  title: "Реликвии",
  back: { label: "РЕЛИКВИИ" },
  cards: [
    {
      id: "vial",
      title: "Кровь луны",
      count: 3,
      front: {
        art: "assets/arcane/vial.png",
        title: "Кровь луны",
        kind: "Зелье",
        rules: "Выпей в свой ход. Восстанови жизнь или сними страх. Пустой флакон остаётся в руке до конца раунда.",
      },
    },
    {
      id: "book",
      title: "Некрономикон",
      count: 3,
      front: {
        art: "assets/arcane/book.png",
        title: "Некрономикон",
        kind: "Книга",
        rules: "Открой на чужом ходу и назови запретное слово. Цель сбрасывает карту, а ты берёшь метку безумия.",
      },
    },
    {
      id: "key",
      title: "Ключ бездны",
      count: 3,
      front: {
        art: "assets/arcane/key.png",
        title: "Ключ бездны",
        kind: "Артефакт",
        rules: "Один раз за партию открой закрытую дверь, не проверяя ловушку. После этого ключ трескается.",
      },
    },
    {
      id: "tower",
      title: "Башня луны",
      count: 3,
      front: {
        art: "assets/arcane/tower.png",
        title: "Башня луны",
        kind: "Место",
        rules: "Пока ты здесь, заклинания стоят на одну ману меньше. Уйти в ход, когда вошёл, нельзя.",
      },
    },
    {
      id: "knife",
      title: "Ритуальный нож",
      count: 3,
      front: {
        art: "assets/arcane/knife.png",
        title: "Ритуальный нож",
        kind: "Оружие",
        rules: "Удар наносит две раны. Если цель — союзник, вместо ран возьми карту из сброса.",
      },
    },
    {
      id: "eye",
      title: "Око стража",
      count: 3,
      front: {
        art: "assets/arcane/eye.png",
        title: "Око стража",
        kind: "Заклинание",
        rules: "Посмотри верхние три карты колоды. Одну оставь себе, остальные верни в любом порядке.",
      },
    },
  ],
};
