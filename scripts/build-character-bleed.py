"""Build the cut-ready character and role copies.

Each picture is the card plus 4 mm: 2 mm inside the cut line and 2 mm outside it.
On a face, the photo side of that margin stays black. Below the parchment's diagonal
the margin continues the card's own parchment color, with the paper texture laid over it.
The character shirt has no parchment, so its margin stays black.
The role back is parchment all the way to the edge, so its whole margin is parchment.
"""

import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
TEXTURE = Path(r"D:\All\Stu\history\notDRGHistory\sources\old-paper-vintage-texture-background-2909013.jpg")
TRIM_W = 63
TRIM_H = 98
BLEED_MM = 4
# The torn edge is one line per kind of picture (675×1050). Roles sit higher than characters.
CHARACTER_L, CHARACTER_R = 762.75, 654.15
ROLE_L, ROLE_R = 579.0, 470.5
CHARACTERS = ROOT / "public" / "assets" / "century" / "characters"
CHARACTER_BLEED = ROOT / "public" / "assets" / "century" / "characters-bleed"
ROLES = ROOT / "public" / "assets" / "century" / "roles"
ROLE_BLEED = ROOT / "public" / "assets" / "century" / "roles-bleed"
BACK = ROOT / "public" / "assets" / "century" / "back.png"
BACK_BLEED = ROOT / "public" / "assets" / "century" / "back-bleed.png"
ROLE_BACK = ROOT / "public" / "assets" / "century" / "role-back.png"
ROLE_BACK_BLEED = ROOT / "public" / "assets" / "century" / "role-back-bleed.png"
DECK = ROOT / "src" / "designs" / "century" / "deck.ts"


def texture_fiber() -> np.ndarray:
    tex = Image.open(TEXTURE).convert("L")
    # Interior of the sheet, clear of the torn rim and the stock number.
    crop = tex.crop((320, 200, 1180, 760))
    fine = np.asarray(crop).astype(np.float32) - np.asarray(crop.filter(ImageFilter.GaussianBlur(6))).astype(np.float32)
    return fine / fine.std()


def black_pad(src: Path, dest: Path) -> tuple[int, int]:
    image = Image.open(src).convert("RGB")
    pad_x = round(image.width * BLEED_MM / TRIM_W)
    pad_y = round(image.height * BLEED_MM / TRIM_H)
    canvas = Image.new("RGB", (image.width + pad_x * 2, image.height + pad_y * 2), (0, 0, 0))
    canvas.paste(image, (pad_x, pad_y))
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest)
    return pad_x, pad_y


def faction_of(median: np.ndarray) -> str:
    """Fascist parchment is the dark olive, communist the orange, liberal the grey."""
    if float(median.max() - median.min()) < 28:
        return "L"
    if median[0] > 190:
        return "K"
    return "F"


SCREEN = ROOT / "preview" / "gimp-parchment.png"


def gimp_parchment() -> np.ndarray:
    """The parchment piece from the GIMP screenshot, below the torn edge, at card scale."""
    image = np.asarray(Image.open(SCREEN).convert("RGB"))
    crop = image[310:530, 90:880].astype(np.float32)
    return crop / np.median(crop.reshape(-1, 3), axis=0)


def reflect_tile(tile: np.ndarray, height: int, width: int) -> np.ndarray:
    th, tw = tile.shape[:2]
    bands = []
    filled = 0
    flip_y = False
    while filled < height:
        band = tile[::-1] if flip_y else tile
        pieces = []
        across = 0
        flip_x = False
        while across < width:
            pieces.append(band[:, ::-1] if flip_x else band)
            across += tw
            flip_x = not flip_x
        bands.append(np.concatenate(pieces, axis=1)[:, :width])
        filled += th
        flip_y = not flip_y
    return np.concatenate(bands, axis=0)[:height]


def write_character_bleeds() -> int:
    """One parchment sheet per faction, the GIMP paper continued below the shared diagonal."""
    pad = round(675 * BLEED_MM / TRIM_W)
    width, height = 675 + pad * 2, 1050 + pad * 2
    paper = reflect_tile(gimp_parchment(), height, width)

    loaded: list[tuple[Path, np.ndarray, np.ndarray]] = []
    for src in sorted(CHARACTERS.glob("*.png")):
        image = np.asarray(Image.open(src).convert("RGB"))
        if image.shape[1] != 675 or image.shape[0] != 1050:
            raise SystemExit(f"{src.name} is {image.shape[1]}×{image.shape[0]}, expected 675×1050")
        patch = image[960:1010, 120:280]
        median = np.median(patch.reshape(-1, 3), axis=0)
        loaded.append((src, image, median))

    groups: dict[str, list[tuple[Path, np.ndarray, np.ndarray]]] = {"F": [], "K": [], "L": []}
    for item in loaded:
        groups[faction_of(item[2])].append(item)
    print("factions", {key: len(items) for key, items in groups.items()})
    for key, items in groups.items():
        print(key, ", ".join(src.stem for src, _, _ in items[:8]))

    sheets: dict[str, np.ndarray] = {}
    for key, items in groups.items():
        if not items:
            continue
        target = np.median(np.stack([median for _, _, median in items]), axis=0)
        sheets[key] = np.clip(paper * target, 0, 255).astype(np.uint8)
        print(key, np.round(target, 1))

    slope = (CHARACTER_R - CHARACTER_L) / (675 - 1)
    ys = np.arange(height)[:, None]
    xs = np.arange(width)[None, :]
    line = pad + CHARACTER_L + slope * (xs - pad)
    below = ys >= line
    outside = np.ones((height, width), dtype=bool)
    outside[pad : pad + 1050, pad : pad + 675] = False
    margin = below & outside

    CHARACTER_BLEED.mkdir(parents=True, exist_ok=True)
    for src, image, median in loaded:
        canvas = np.zeros((height, width, 3), np.uint8)
        canvas[pad : pad + 1050, pad : pad + 675] = image
        canvas[margin] = sheets[faction_of(median)][margin]
        Image.fromarray(canvas).save(CHARACTER_BLEED / src.name)
    return len(loaded)


def parchment_pad(src: Path, dest: Path, fiber: np.ndarray, line_l: float, line_r: float) -> tuple[int, int]:
    card_im = Image.open(src).convert("RGB")
    card = np.asarray(card_im)
    h, w, _ = card.shape
    if (w, h) != (675, 1050):
        raise SystemExit(f"{src.name} is {w}×{h}, expected 675×1050")
    tone = np.asarray(card_im.filter(ImageFilter.GaussianBlur(16))).astype(np.float32)
    pad_x = round(w * BLEED_MM / TRIM_W)
    pad_y = round(h * BLEED_MM / TRIM_H)
    canvas_h, canvas_w = h + pad_y * 2, w + pad_x * 2
    slope = (line_r - line_l) / (w - 1)

    paper = card[h - 48 : h - 8, 80 : 260].astype(np.float32)
    fine_std = float((paper - tone[h - 48 : h - 8, 80 : 260]).std())

    ys = np.arange(canvas_h)[:, None]
    xs = np.arange(canvas_w)[None, :]
    line = pad_y + line_l + slope * (xs - pad_x)
    below = np.broadcast_to(ys, (canvas_h, canvas_w)) >= np.broadcast_to(line, (canvas_h, canvas_w))
    outside = np.ones((canvas_h, canvas_w), dtype=bool)
    outside[pad_y : pad_y + h, pad_x : pad_x + w] = False

    nx = np.clip(xs - pad_x, 0, w - 1).astype(np.int32)
    ny = np.clip(ys - pad_y, 0, h - 1).astype(np.int32)
    color = tone[ny, nx]
    vy = (np.arange(canvas_h)[:, None] + 30) % fiber.shape[0]
    vx = (np.arange(canvas_w)[None, :] + 80) % fiber.shape[1]
    field = np.clip(color + fiber[vy, vx][..., None] * fine_std, 0, 255)

    canvas = np.zeros((canvas_h, canvas_w, 3), np.uint8)
    canvas[pad_y : pad_y + h, pad_x : pad_x + w] = card
    canvas[below & outside] = field[below & outside].astype(np.uint8)
    dest.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(canvas).save(dest)
    return pad_x, pad_y


def role_hint():
    import importlib.util

    spec = importlib.util.spec_from_file_location("role_hint", ROOT / "preview" / "_role_hint.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def graded_parchment(image: Image.Image) -> Image.Image:
    """Same grade the role back was painted with."""
    from PIL import ImageEnhance

    red, green, blue = image.split()
    red = red.point(lambda v: min(255, int(v * 0.74 + 8)))
    green = green.point(lambda v: min(255, int(v * 0.68 + 6)))
    blue = blue.point(lambda v: min(255, int(v * 0.55)))
    card = Image.merge("RGB", (red, green, blue))
    return ImageEnhance.Contrast(card).enhance(1.08)


def match_published_paper(image: Image.Image, hint) -> Image.Image:
    """The published back is the same sheet, a little darker than the raw grade."""
    fresh = np.asarray(hint.parchment()).astype(np.float32)
    published = np.asarray(Image.open(ROLE_BACK).convert("RGB")).astype(np.float32)
    sample = (slice(1000, 1040), slice(40, 400))
    src = fresh[sample].reshape(-1, 3)
    dst = published[sample].reshape(-1, 3)
    out = np.asarray(image).astype(np.float32)
    for channel in range(3):
        slope, intercept = np.linalg.lstsq(
            np.stack([src[:, channel], np.ones(len(src))], axis=1),
            dst[:, channel],
            rcond=None,
        )[0]
        out[..., channel] = out[..., channel] * slope + intercept
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def role_back_sheet() -> Image.Image:
    """Redraw the rules back at the cut size on one continuous piece of the parchment sheet."""
    hint = role_hint()
    pad = round(675 * BLEED_MM / TRIM_W)
    width, height = 675 + pad * 2, 1050 + pad * 2
    source = Image.open(TEXTURE).convert("RGB")
    # The whole cut card, including the outer 2 mm, fits in the sheet.
    # Inside the red line the crop is the same window the ordinary back was taken from.
    crop_h = source.height
    crop_w = crop_h * width / height
    center_x = 280 + int(960 * 675 / 1050) / 2
    x0 = center_x - crop_w / 2
    sheet = source.crop((int(round(x0)), 0, int(round(x0 + crop_w)), crop_h))
    sheet = graded_parchment(sheet.resize((width, height), Image.Resampling.LANCZOS))
    sheet = match_published_paper(sheet, hint)

    draw = ImageDraw.Draw(sheet)
    title = hint.font("calibrib.ttf", 28)
    body = hint.font("calibriz.ttf", 25)
    letters = hint.font("calibrib.ttf", 26)
    lead = 35
    x, text_width = 34 + pad, 607
    y = 32 + pad
    ink = hint.INK
    y = hint.heading(draw, x, y, "Начало игры", title, text_width, "bar")
    y = hint.paragraph(draw, x, y, hint.SETUP, body, ink, text_width, lead)
    y += 16
    y = hint.heading(draw, x, y, "В свой ход", title, text_width, "bar")
    y = hint.paragraph(draw, x, y, hint.CHOICE, body, ink, text_width, lead)
    y += 2
    for action in hint.ACTIONS:
        y = hint.item(draw, x, y, action, body, ink, text_width, lead)
        y += 6
    y += 10
    y = hint.heading(draw, x, y, "Конец игры", title, text_width, "bar")
    y = hint.paragraph(draw, x, y, hint.END, body, ink, text_width, lead)
    y += 16
    y = hint.heading(draw, x, y, "Свойства карт", title, text_width, "bar")
    y = hint.faction_item(draw, x, y, body, letters, ink, (hint.BRONZE, hint.RED, hint.BLUE), text_width, lead)
    y += 4
    y = hint.item(draw, x, y, hint.STRENGTH, body, ink, text_width, lead)
    y += 4
    hint.item(draw, x, y, hint.PREP, body, ink, text_width, lead)
    return sheet


def write_role_back_bleed(dest: Path) -> tuple[int, int]:
    image = role_back_sheet()
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest)
    return (image.width - 675) // 2, (image.height - 1050) // 2


def link_cuts(text: str, type_id: str, folder: str) -> tuple[str, int]:
    pattern = re.compile(
        rf'(typeId: "{type_id}".*?front: \{{ art: "assets/century/{folder}/([^"]+)" \}})'
    )

    def repl(match: re.Match[str]) -> str:
        line_end = text.find("\n", match.end())
        line = text[match.start() : line_end if line_end >= 0 else len(text)]
        if ", cut:" in line:
            return match.group(0)
        return match.group(0) + f', cut: {{ art: "assets/century/{folder}-bleed/{match.group(2)}" }}'

    return pattern.subn(repl, text)


def link_hint_cuts(text: str) -> tuple[str, int]:
    if "hints-bleed/" in text:
        return text, 0
    pattern = re.compile(
        r'front: \{ art: "assets/century/hints/([^"]+)" \},\n      back: \{ art: "assets/century/hints/([^"]+)" \},'
    )

    def repl(match: re.Match[str]) -> str:
        front, back = match.group(1), match.group(2)
        return (
            match.group(0)
            + f'\n      cut: {{ art: "assets/century/hints-bleed/{front}" }},'
            + f'\n      cutBack: {{ art: "assets/century/hints-bleed/{back}" }},'
        )

    return pattern.subn(repl, text)


def write_likbez_bleeds() -> int:
    """Likbez faces keep a black margin. Rules faces are redrawn on parchment elsewhere."""
    out_dir = ROOT / "public" / "assets" / "century" / "hints-bleed"
    out_dir.mkdir(parents=True, exist_ok=True)
    written = 0
    for path in sorted((ROOT / "public" / "assets" / "century" / "hints").glob("likbez-*.png")):
        black_pad(path, out_dir / path.name)
        written += 1
    return written


def link_deck() -> int:
    raw = DECK.read_bytes()
    crlf = b"\r\n" in raw
    text = raw.decode("utf-8").replace("\r\n", "\n")
    text, count = link_cuts(text, "characters", "characters")
    text, role_count = link_cuts(text, "roles", "roles")
    text, hint_count = link_hint_cuts(text)
    role_back = '    roles: { art: "assets/century/role-back-bleed.png" },'
    if role_back not in text:
        needle = '    characters: { art: "assets/century/back-bleed.png" },'
        if needle not in text:
            raise SystemExit("character cut back not found")
        text = text.replace(needle, needle + "\n" + role_back, 1)
    out = text.replace("\n", "\r\n") if crlf else text
    DECK.write_bytes(out.encode("utf-8"))
    return count + role_count + hint_count


def main() -> None:
    fiber = texture_fiber()
    character_count = write_character_bleeds()
    pads = [(round(675 * BLEED_MM / TRIM_W), round(1050 * BLEED_MM / TRIM_H))]
    print(f"characters {character_count}")
    pads.append(black_pad(BACK, BACK_BLEED))
    role_pads = [
        parchment_pad(src, ROLE_BLEED / src.name, fiber, ROLE_L, ROLE_R)
        for src in sorted(ROLES.glob("*.png"))
    ]
    role_pads.append(write_role_back_bleed(ROLE_BACK_BLEED))
    import importlib.util

    rules_spec = importlib.util.spec_from_file_location("rules_cards", ROOT / "preview" / "_rules_cards.py")
    rules = importlib.util.module_from_spec(rules_spec)
    sys_path = str(ROOT / "preview")
    import sys
    sys.path.insert(0, sys_path)
    rules_spec.loader.exec_module(rules)
    rules.main()
    likbez = write_likbez_bleeds()
    print(f"characters {character_count} roles {len(role_pads)} likbez {likbez} pad {pads[0]}")
    print(f"deck links {link_deck()}")


if __name__ == "__main__":
    main()
