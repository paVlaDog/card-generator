"""Paint the shared title line onto the parchment.

The curve was traced once from the median of the sample cards and saved
next to this script. Running it again redraws that same stroke.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

here = Path(__file__).resolve().parent / "res-arcana-line"
out = Path(__file__).resolve().parents[1] / "public" / "assets" / "res-arcana"
W, H = 700.0, 980.0


def main() -> None:
    curve = np.load(here / "_main.npy")
    spur = np.load(here / "_spur.npy")
    paper = Image.open(here / "paper.png").convert("RGB")
    width, height = paper.size

    def place(point: np.ndarray) -> tuple[float, float]:
        return (
            (3 + point[0] / W * 62) / 68 * width,
            (3 + point[1] / H * 87) / 93 * height,
        )

    scale = 4
    big = paper.resize((width * scale, height * scale), Image.Resampling.LANCZOS)
    layer = Image.new("RGBA", big.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    ink = (88, 49, 24, 230)

    def stroke(points: np.ndarray, weight: int) -> None:
        placed = [(place(point)[0] * scale, place(point)[1] * scale) for point in points]
        draw.line(placed, fill=ink, width=weight, joint="curve")

    stroke(curve, 13)
    crest = curve[int(np.argmin(np.hypot(curve[:, 0] - spur[0, 0], curve[:, 1] - spur[0, 1])))]
    stroke(np.vstack([crest, spur]), 12)

    result = Image.alpha_composite(big.convert("RGBA"), layer).convert("RGB")
    result.resize((width, height), Image.Resampling.LANCZOS).save(out / "background.png")


if __name__ == "__main__":
    main()
