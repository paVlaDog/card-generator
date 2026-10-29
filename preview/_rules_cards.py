"""Full rules, set in the same bar layout as the role-back hint."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import ImageDraw

from _role_hint import (
    BLUE,
    BRONZE,
    H,
    INK,
    RED,
    W,
    apply_frame,
    draw_runs,
    font,
    heading,
    item,
    paragraph,
    parchment,
    parchment_size,
)

OUT = Path(__file__).resolve().parent

# (bar title, body). body is a list of strings: a string is a paragraph, a tuple is a bullet.
CARDS = [
    (
        "rules-1-play",
        30,
        [
            (
                "Первая игра",
                [
                    ("Уберите в коробку все карты с ромбом в правом нижнем углу — они вам не пригодятся.",),
                    ("Раздайте каждому игроку по 4 карты персонажей и 1 карту роли, остальные карты персонажей образуют колоду. Вашу роль и карты персонажей на руке можете смотреть только вы.",),
                    ("Выделите место для карт перед каждым игроком — это будет его область, в которой будут храниться разыгранные им карты.",),
                    ("Случайным образом выберите первого игрока, он совершает первый ход.",),
                ],
            ),
            (
                "Ход игры",
                [
                    "В свой ход вы можете сделать 1 из 3 действий — разыграть карту, взять карту или пасануть.",
                    ("Разыграть карту: Разместите карту персонажа в своей области и мгновенно используйте её свойство. Игнорируйте слово «Подготовка» в свойстве карты.",),
                    ("Взять карту: Возьмите карту персонажа из колоды в руку. В руке может быть максимум 4 карты. Если у вас уже 4 карты на руке — вы не можете выполнить это действие.",),
                    ("Пас: Если в колоде закончились карты, вы можете пасануть. Для вас игра заканчивается, ваши ходы пропускаются и вы ждёте паса остальных игроков. Вы обязаны пасануть, если и в вашей руке, и в колоде нет карт.",),
                ],
            ),
        ],
    ),
    (
        "rules-2-end",
        32,
        [
            (
                "Конец игры",
                [
                    ("Игра заканчивается, когда пасанули все игроки. Далее выполните следующие действия:",),
                    ("Примените все эффекты конца игры (Оппенгеймер и Курчатов, если они есть в игре).",),
                    ("Все игроки открывают свои роли и считают победные очки. Способ подсчёта победных очков указан на вашей карте роли.",),
                ],
            ),
            (
                "Термины",
                [
                    "faction",
                    ("Сила карты — число символов своей фракции на карте.",),
                ],
            ),
            (
                "Полная версия",
                [
                    ("Если вы освоились в базовой версии игры, можете переходить к полной версии.",),
                    ("Добавьте в игру все карты с ромбом в правом нижнем углу.",),
                    ("У карт начинает работать свойство «Подготовка». При розыгрыше такой карты не активируйте её эффект, положите карту на бок.",),
                    ("Если на начало вашего хода в вашей области находится карта со свойством «Подготовка», повернутся набок — поверните её вертикально и используйте её свойство.",),
                ],
            )
        ],
    ),
    (
        "rules-3-mechanics",
        33,
        [
            (
                "Механики карт",
                [
                    ("Йозеф Гейббельс и Сиро Исии активируют все свойства карты, включая «Подготовку», то есть карта будет выложена в повёрнутом набок состоянии.",),
                    ("При уничтожении карты эффекты защитных карт срабатывают в следующем порядке: Защитники Пёрл-Харбора, Хо Ши Мин, Шарль де Голль, Вьетминь. Если карта была спасена Защитниками Пёрл-Харбора или Хо Ши Мином, эффекты Шарля де Голля и Вьетминя не срабатывают.",),
                    ("Антибатисты игнорируют свойства карт при уничтожении, но не при перемещении, что позволяет защититься от них Голубой Дивизией. Шарль де Голль и Вьетминь на Антибатист не работают.",),
                    ("Вьетминь, Хуйвейбины и Рейнджеры позволяют брать карты в руку сверх максимума в 4.",),
                    ("Свойство карты выполняется полностью, даже если карта была сброшена в середине его выполнения. Например, если авиация уничтожает карты в области Шарля де Голля, она уничтожит обе карты, даже несмотря на то, что должна отправиться в сброс после уничтожения первой.",),
                ],
            )
        ],
    ),
]


def faction_line(draw, x, y, body, letters, width, leading):
    hang = int(draw.textlength("— ", font=body))
    runs = [
        ("— ", INK, body),
        ("Ф", BRONZE, letters),
        (", ", INK, body),
        ("Л", BLUE, letters),
        (" и ", INK, body),
        ("К", RED, letters),
        (" в описаниях свойств карт — фракции Фашистов, Либералов и Коммунистов.", INK, body),
    ]
    return draw_runs(draw, x, y, runs, width, leading, hang)


PUBLISHED = {
    "rules-1-play": "rules-play.png",
    "rules-2-end": "rules-end.png",
    "rules-3-mechanics": "rules-mechanics.png",
}
PUBLIC = Path(__file__).resolve().parents[1] / "public" / "assets" / "century"
PAD = 43


def paint(name: str, lead: int, sections: list, pad: int = 0):
    im = parchment_size(W + pad * 2, H + pad * 2) if pad else parchment()
    draw = ImageDraw.Draw(im)
    title = font("calibrib.ttf", 28)
    body = font("calibriz.ttf", 25)
    letters = font("calibrib.ttf", 26)
    x, width = 34 + pad, 607
    y = 32 + pad
    for index, (head, blocks) in enumerate(sections):
        if index:
            y += 14
        y = heading(draw, x, y, head, title, width, "bar")
        for block in blocks:
            if block == "faction":
                y = faction_line(draw, x, y, body, letters, width, lead)
            elif isinstance(block, tuple):
                y = item(draw, x, y, block[0], body, INK, width, lead)
            else:
                y = paragraph(draw, x, y, block, body, INK, width, lead)
            y += 8
    print(name, "pad", pad, "ends", y, "over" if y > H + pad - 40 else "ok")
    if not pad:
        im = apply_frame(im)
    return im


def main():
    bleed_dir = PUBLIC / "hints-bleed"
    bleed_dir.mkdir(parents=True, exist_ok=True)
    for name, lead, sections in CARDS:
        plain = paint(name, lead, sections)
        plain.save(OUT / f"{name}.png")
        published = PUBLISHED[name]
        plain.save(PUBLIC / "hints" / published)
        paint(name, lead, sections, PAD).save(bleed_dir / published)


if __name__ == "__main__":
    main()
