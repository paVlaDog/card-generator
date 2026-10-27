"""Pull the shared parchment off the sample cards.

The drawings, titles and icons are different on every card, so they are not
part of this layer. What the cards share is the paper: its colour, taken from
the margins where the sheet shows through, and a canvas tooth of the same
strength. The middle of every photo is a picture, so that part of the sheet
is filled from the margins.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

assets = Path(r"C:\Users\User\.cursor\projects\d-All-Ran-hellowin-2026\assets")
files = sorted(path for path in assets.glob("*.png") if path.stat().st_size > 100_000)
W, H = 620, 870
out = Path(__file__).resolve().parents[1] / "public" / "assets" / "res-arcana"


def crop(im: Image.Image) -> Image.Image:
    rgb = im.convert("RGB")
    pixels = np.asarray(rgb)
    ink = pixels.mean(2) < 248
    ys, xs = np.where(ink)
    return rgb.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def blur(card: np.ndarray, radius: float) -> np.ndarray:
    return np.asarray(
        Image.fromarray(card.astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius)),
        dtype=np.float32,
    )


cards = np.stack(
    [
        np.asarray(crop(Image.open(path)).resize((W, H), Image.Resampling.LANCZOS), dtype=np.float32)
        for path in files
    ]
)

samples = []
tooth = []
for card in cards:
    lifted = blur(card, 6)
    bare = np.abs(card.mean(-1) - lifted.mean(-1)) < 7
    bare[:, : int(W * 0.82)] = False
    bare[: int(H * 0.22), :] = False
    bare[int(H * 0.62) :, :] = False
    if int(bare.sum()) < 200:
        continue
    samples.append(np.percentile(lifted[bare], 70, axis=0))
    tooth.append((card - lifted)[bare].std(0))

color = np.mean(samples, axis=0)
grain_strength = np.mean(tooth, axis=0)
print("paper", np.round(color, 1), "tooth", np.round(grain_strength, 2))

rng = np.random.default_rng(5)
fine = rng.normal(0, 1, (H, W)).astype(np.float32)
fine = blur(np.repeat(fine[..., None], 3, axis=-1), 0.7)[..., 0]
fine /= fine.std() + 1e-6
stains = rng.normal(0, 1, (H // 8, W // 8)).astype(np.float32)
stains = np.asarray(Image.fromarray(stains).resize((W, H), Image.Resampling.BICUBIC), dtype=np.float32)
stains = stains / (stains.std() + 1e-6)
yy, xx = np.mgrid[0:H, 0:W]
weave = np.sin(xx * 2 * np.pi / 4.0) * np.sin(yy * 2 * np.pi / 4.0)

sheet = np.ones((H, W, 3), np.float32) * color
sheet += fine[..., None] * grain_strength * 0.4
sheet += weave[..., None] * 1.3
sheet += stains[..., None] * np.array([3.2, 2.6, 1.6])
yy, xx = np.mgrid[0:H, 0:W]
edge = np.clip(1 - 0.06 * ((xx / (W - 1)) * 2 - 1) ** 2 - 0.04 * np.clip((yy / (H - 1)) * 2 - 1, 0, 1) ** 2, 0.9, 1)
sheet *= edge[..., None]
result = np.clip(sheet, 0, 255).astype(np.uint8)
Image.fromarray(result).resize((880, 1235), Image.Resampling.LANCZOS).save(out / "background.png", optimize=True)
print("saved", (out / "background.png").stat().st_size)
