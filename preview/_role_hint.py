"""Three role-back hint layouts at the card size, 675×1050."""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont

OUT = Path(__file__).resolve().parent
SRC = Path(r"D:\All\Stu\history\notDRGHistory\sources\old-paper-vintage-texture-background-2909013.jpg")
FONTS = Path(r"C:\Windows\Fonts")

W, H = 675, 1050
INK = (26, 18, 12)
GOLD = (215, 171, 74)
CREAM = (236, 224, 196)
RED = (176, 22, 18)
BLUE = (16, 58, 168)
BLUE_ON_DARK = (142, 178, 232)
RED_ON_DARK = (232, 96, 88)
BRONZE = (112, 68, 18)

SETUP = "В начале игры получите 4 карты персонажей и 1 карту роли"
CHOICE = "Одно из трёх:"
ACTIONS = [
    "Разыграть карту: Выложите карту персонажа с руки в свою область и используйте свойство.",
    "Взять карту: Возьмите карту из колоды в руку, максимум карт в руке — 4.",
    "Пас: Только если в колоде закончились карты. Вы можете пасануть, ваши ходы пропускаются и вы ждёте паса остальных игроков.",
]
END = "Игра заканчивается, когда все игроки пасанут. Вы вскрываете свои роли и считаете победные очки."
STRENGTH = "Сила — кол-во символов фракции на карте."
PREP = (
    "Подготовка (только в усложнённой версии) — карты с подготовкой разыгрываются "
    "повернутые и без использования свойства. Если повернутся карта с подготовкой "
    "в вашей области на начало вашего хода — поверните и используйте свойство."
)


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def noise(x: int, y: int) -> float:
    n = math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    return n - math.floor(n)


def parchment() -> Image.Image:
    src = Image.open(SRC).convert("RGB")
    crop_w = int(960 * W / H)
    left, top = 280, 20
    crop = src.crop((left, top, left + crop_w, top + 960))
    card = crop.resize((W, H), Image.Resampling.LANCZOS)
    r, g, b = card.split()
    r = r.point(lambda v: min(255, int(v * 0.74 + 8)))
    g = g.point(lambda v: min(255, int(v * 0.68 + 6)))
    b = b.point(lambda v: min(255, int(v * 0.55)))
    card = Image.merge("RGB", (r, g, b))
    return ImageEnhance.Contrast(card).enhance(1.08)


def apply_frame(card: Image.Image) -> Image.Image:
    """Soft edge like the photo grunge on character cards: a few pixels, not a band."""
    im = card.copy()
    px = im.load()
    for y in range(H):
        for x in range(W):
            edge = min(x, y, W - 1 - x, H - 1 - y)
            if edge > 8:
                continue
            n = noise(x, y)
            reach = 4.5 + 2.2 * math.sin(x * 0.17 + y * 0.04) + 1.4 * math.sin(y * 0.23)
            if edge > reach or n < 0.28:
                if edge < 7 and n > 0.996:
                    px[x, y] = (22, 16, 10)
                continue
            fade = (reach - edge) / reach
            r, g, b = px[x, y]
            k = 1 - 0.82 * fade * fade
            px[x, y] = (int(r * k), int(g * k), int(b * k))
    return im


def wrap(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        trial = word if not current else f"{current} {word}"
        if draw.textlength(trial, font=face) <= width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def stroked(draw, xy, value, face, fill, stroke=INK, sw=2):
    x, y = xy
    for dy in range(-sw, sw + 1):
        for dx in range(-sw, sw + 1):
            if dx or dy:
                draw.text((x + dx, y + dy), value, font=face, fill=stroke)
    draw.text((x, y), value, font=face, fill=fill)


def draw_runs(draw, x, y, runs, width, leading):
    cursor = x
    line_y = y
    for value, fill, run_face in runs:
        parts = value.split(" ")
        for index, part in enumerate(parts):
            token = part if index == len(parts) - 1 else part + " "
            if not token:
                continue
            length = draw.textlength(token, font=run_face)
            if cursor + length > x + width and cursor > x:
                line_y += leading
                cursor = x
            draw.text((cursor, line_y), token, font=run_face, fill=fill)
            cursor += length
    return line_y + leading


def heading(draw, x, y, title, face, width, kind):
    if kind == "bar":
        draw.rectangle((x, y, x + width, y + 34), fill=(22, 16, 12))
        stroked(draw, (x + 12, y + 3), title, face, GOLD, sw=1)
        return y + 44
    stroked(draw, (x, y), title, face, GOLD, sw=2)
    return y + 40


def paragraph(draw, x, y, value, face, fill, width, leading):
    for line in wrap(draw, value, face, width):
        draw.text((x, y), line, font=face, fill=fill)
        y += leading
    return y


def item(draw, x, y, value, face, fill, width, leading):
    mark = "—"
    indent = int(draw.textlength(f"{mark} ", font=face))
    draw.text((x, y), mark, font=face, fill=fill)
    for line in wrap(draw, value, face, width - indent):
        draw.text((x + indent, y), line, font=face, fill=fill)
        y += leading
    return y


def faction_item(draw, x, y, face, letters, base, fills, width, leading):
    f_fill, k_fill, l_fill = fills
    indent = int(draw.textlength("— ", font=face))
    runs = [
        ("— ", base, face),
        ("Ф", f_fill, letters),
        (", ", base, face),
        ("К", k_fill, letters),
        (" и ", base, face),
        ("Л", l_fill, letters),
        (" — принадлежность Фашистам, Коммунистам и Либералам.", base, face),
    ]
    return draw_runs(draw, x, y, runs, width, leading)


def paint(kind: str) -> Image.Image:
    im = parchment()
    draw = ImageDraw.Draw(im)
    title = font("calibrib.ttf", 28)
    body = font("calibriz.ttf", 25)
    letters = font("calibrib.ttf", 26)
    lead = 35
    x, width = 34, 607
    y = 32
    ink = INK

    y = heading(draw, x, y, "Начало игры", title, width, kind)
    y = paragraph(draw, x, y, SETUP, body, ink, width, lead)
    y += 16
    y = heading(draw, x, y, "В свой ход", title, width, kind)
    y = paragraph(draw, x, y, CHOICE, body, ink, width, lead)
    y += 2
    for action in ACTIONS:
        y = item(draw, x, y, action, body, ink, width, lead)
        y += 6
    y += 10
    y = heading(draw, x, y, "Конец игры", title, width, kind)
    y = paragraph(draw, x, y, END, body, ink, width, lead)
    y += 16

    if kind == "split":
        band = y + 8
        torn_band(im, band)
        draw = ImageDraw.Draw(im)
        y = band + 18
        ink = CREAM
        fills = (GOLD, RED_ON_DARK, BLUE_ON_DARK)
    else:
        fills = (BRONZE, RED, BLUE)

    y = heading(draw, x, y, "Свойства карт", title, width, "gold" if kind == "split" else kind)
    y = faction_item(draw, x, y, body, letters, ink, fills, width, lead)
    y += 4
    y = item(draw, x, y, STRENGTH, body, ink, width, lead)
    y += 4
    y = item(draw, x, y, PREP, body, ink, width, lead)
    print(kind, "ends", y)
    return apply_frame(im)


def torn_band(im: Image.Image, top: int) -> None:
    px = im.load()
    for y in range(max(0, top - 10), H):
        for x in range(W):
            edge = min(x, y, W - 1 - x, H - 1 - y)
            lip = int(6 * math.sin(x * 0.05) + 4 * math.sin(x * 0.13 + 2))
            if y < top + lip:
                continue
            n = noise(x, y)
            shade = 16 + int(10 * n)
            px[x, y] = (shade, int(shade * 0.86), int(shade * 0.62))


def main():
    paint("gold").save(OUT / "role-hint-sheet.png")
    paint("bar").save(OUT / "role-hint-actions.png")
    paint("split").save(OUT / "role-hint-split.png")


if __name__ == "__main__":
    main()
