"""Paint likbez blocks onto the faction-band template."""
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC_TEXT = Path(r"D:\All\Stu\history\notDRGHistory\3red\spravki.md")
TEMPLATE = ROOT / "preview" / "hint-colors.png"
OUT = ROOT / "public" / "assets" / "century" / "hints"
FONTS = Path(r"C:\Windows\Fonts")
W, H = 675, 1050
INK = (28, 18, 12)

# Boxes on the 675×1050 card, inside the band and clear of the edge.
BANDS = {
    "title": (32, 22, 611, 78),
    "F": (32, 118, 611, 292),
    "K": (32, 430, 611, 286),
    "L": (32, 748, 611, 262),
}


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def wrap(draw, text, face, width):
    lines, current = [], ""
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


def fit(draw, text, width, height, face_name, biggest, smallest):
    for size in range(biggest, smallest - 1, -1):
        face = font(face_name, size)
        leading = max(size + 2, round(size * 1.16))
        lines = wrap(draw, text, face, width)
        if len(lines) * leading <= height:
            return face, leading, lines, size
    face = font(face_name, smallest)
    leading = max(smallest + 2, round(smallest * 1.16))
    return face, leading, wrap(draw, text, face, width), smallest


def parse_blocks():
    blocks = []
    title = None
    item_name = None
    buf = []
    items = []

    def flush_item():
        nonlocal item_name, buf
        if item_name:
            items.append((item_name, " ".join(buf).strip()))
        item_name, buf = None, []

    def flush_block():
        nonlocal title, items
        flush_item()
        if title:
            blocks.append((title, items))
        title, items = None, []

    for line in SRC_TEXT.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            flush_block()
            title = line[3:].strip()
        elif line.startswith("### "):
            flush_item()
            item_name = line[4:].strip()
        elif line.strip() and item_name:
            buf.append(line.strip())
    flush_block()
    return blocks


def draw_block(base, draw, title, texts):
    x, y, width, height = BANDS["title"]
    label = title
    if title == "Разное":
        label = ", ".join(name.split("—")[0].strip() for name, _ in texts)
        # texts is list of strings in F,K,L order; names passed separately
    face, leading, lines, size = fit(draw, label, width, height, "calibrib.ttf", 30, 18)
    block_h = len(lines) * leading
    cursor = y + (height - block_h) / 2
    for line in lines:
        line_w = draw.textlength(line, font=face)
        draw.text((x + (width - line_w) / 2, cursor), line, font=face, fill=INK)
        cursor += leading
    sizes = {"title": size}
    for key, text in zip(("F", "K", "L"), texts):
        bx, by, bw, bh = BANDS[key]
        face, leading, lines, size = fit(draw, text, bw, bh - 8, "calibriz.ttf", 26, 13)
        sizes[key] = (size, len(lines), len(lines) * leading, bh)
        cursor = by + 4
        for line in lines:
            draw.text((bx, cursor), line, font=face, fill=INK)
            cursor += leading
        if cursor > by + bh + 2:
            print("  OVERFLOW", key, title)
    return sizes


CARD_TITLES = {
    "Арийская раса": "Арийская раса",
    "Родина-мать": "Родина-мать",
    "Американская мечта": "Американская мечта",
    "Вермахт": "Вермахт",
    "Красная армия": "Красная армия",
    "Королевская армия": "Королевская Армия",
    "Чёрнорубашечники": "Чернорубашечники",
    "НКВД": "НКВД",
    "ЦРУ": "ЦРУ",
    "Отряды СС": "Отряды СС",
    "Хунвейбины": "Хуйвейбины",
    "Рейнджеры": "Рейнджеры",
    "Зелёные сердца": "Зелёные Сердца",
    "Ночные ведьмы": "Ночные Ведьмы",
    "Нормандия-Неман": "Нормандия-Неман",
    "Голубая дивизия": "Голубая Дивизия",
    "Вьетминь": "Вьетминь",
    "Защитники Пёрл-Харбора": "Защитники Пёрл-Харбора",
    "Отряд 731": "Отряд 731",
    "Антибатисты": "Антибатисты",
    "МИ-6": "Ми-6",
    "Эрвин Роммель": "Эрвин Роммель",
    "Георгий Жуков": "Георгий Жуков",
    "Дуайт Эйзенхауэр": "Дуайт Эйзенхауэр",
    "Бенито Муссолини": "Бенито Муссолини",
    "Юрий Гагарин": "Юрий Гагарин",
    "Джон Кеннеди": "Джон Кеннеди",
    "Франциско Франко": "Франциско Франко",
    "Хо Ши Мин": "Хо Ши Мин",
    "Шарль де Голль": "Шарль де Голль",
    "Генрих Гиммлер": "Генрих Гимлер",
    "Че Гевара": "Че Гевара",
    "Дуглас Макартур": "Дуглас Макатур",
    "Исороку Ямамото": "Исороку Ямамото",
    "Иосиф Сталин": "Иосиф Сталин",
    "Джозеф Маккарти": "Джозеф Маккарти",
    "Адольф Гитлер": "Адольф Гитлер",
    "Мао Цзэдун": "Мао Цзедун",
    "Франклин Рузвельт": "Франклин Рузвельт",
    "Сиро Исии": "Сиро Исии",
    "Игорь Курчатов": "Игорь Курчатов",
    "Роберт Оппенгеймер": "Роберт Оппенгеймер",
    "Йозеф Геббельс": "Йозеф Гейббельс",
    "Владимир Ленин": "Владимир Ленин",
    "Уинстон Черчилль": "Уинстон Черчиль",
}


def unique_title(title, names):
    return ", ".join(CARD_TITLES[name] for name in names)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    raw = parse_blocks()
    if len(raw) != 15:
        raise SystemExit(f"expected 15 blocks, got {len(raw)}")
    template = Image.open(TEMPLATE).convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    blocks = []
    for index, (title, items) in enumerate(raw, start=1):
        if len(items) != 3:
            raise SystemExit(f"{title}: {len(items)} items")
        names = [name for name, _ in items]
        texts = [text for _, text in items]
        shown = unique_title(title, names)
        card = template.copy()
        draw = ImageDraw.Draw(card)
        # redraw title with the possibly disambiguated label
        sizes = draw_block(card, draw, shown, texts)
        path = OUT / f"likbez-{index:02d}.png"
        card.save(path)
        print(f"{index:02d} {shown}")
        print("   ", sizes)
        blocks.append(shown)
    rules = ROOT / "preview"
    shutil.copyfile(rules / "rules-1-play.png", OUT / "rules-play.png")
    shutil.copyfile(rules / "rules-2-end.png", OUT / "rules-end.png")
    shutil.copyfile(rules / "rules-3-mechanics.png", OUT / "rules-mechanics.png")
    print("blocks", len(blocks))


if __name__ == "__main__":
    main()
