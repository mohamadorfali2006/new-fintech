"""Launch-style tour video: title card, Ken Burns app shots, crossfades, end card.

Run: uv run --with pillow --with imageio --with imageio-ffmpeg python scripts/make_video.py
Reads docs/showcase/app/{dashboard,analytics,transactions,budgets}.png
Writes docs/showcase/tour.mp4 (1280x720, 30fps, H.264).
"""

import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1280, 720, 30
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "docs", "showcase", "app")
OUT = os.path.join(ROOT, "docs", "showcase", "tour.mp4")

BG = (11, 11, 20)
INDIGO = (99, 102, 241)
VIOLET = (168, 85, 247)
WHITE = (255, 255, 255)
MUTED = (161, 161, 170)


def font(size, bold=True):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def title_card(lines, sub=None):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 40], fill=(24, 24, 38))
    y = 250
    for i, (text, size, color) in enumerate(lines):
        f = font(size)
        bb = d.textbbox((0, 0), text, font=f)
        d.text(((W - (bb[2] - bb[0])) / 2, y), text, font=f, fill=color)
        y += (bb[3] - bb[1]) + 24
    if sub:
        f = font(30, bold=False)
        bb = d.textbbox((0, 0), sub, font=f)
        d.text(((W - (bb[2] - bb[0])) / 2, y + 10), sub, font=f, fill=MUTED)
    d.rectangle([W // 2 - 120, H - 120, W // 2 + 120, H - 112], fill=INDIGO)
    return img


def fit_cover(img):
    scale = max(W / img.width, H / img.height)
    nw, nh = int(img.width * scale + 0.5), int(img.height * scale + 0.5)
    img = img.resize((nw, nh), Image.LANCZOS)
    x = (nw - W * 2) // 2
    y = (nh - H * 2) // 2
    return img.crop((x, y, x + W * 2, y + H * 2))


def ken_burns(img, n_frames, zoom_in=True, pan="down"):
    base = fit_cover(img)
    frames = []
    for i in range(n_frames):
        t = i / max(n_frames - 1, 1)
        z = 1.0 + (0.12 * t if zoom_in else 0.12 * (1 - t))
        cw, ch = int(W * 2 / z), int(H * 2 / z)
        if pan == "down":
            cx, cy = W, int(H + (H * 2 - ch) * t)
        else:
            cx, cy = int(W + (W * 2 - cw) * (1 - t)), H
        cx = min(max(cx, cw // 2), W * 2 - cw // 2)
        cy = min(max(cy, ch // 2), H * 2 - ch // 2)
        crop = base.crop((cx - cw // 2, cy - ch // 2, cx + cw // 2, cy + ch // 2))
        frames.append(crop.resize((W, H), Image.LANCZOS))
    return frames


def still(img, n_frames):
    base = fit_cover(img).resize((W, H), Image.LANCZOS)
    return [base.copy() for _ in range(n_frames)]


def xfade(a_frames, b_frames, n=15):
    out = []
    for i in range(n):
        alpha = (i + 1) / (n + 1)
        out.append(Image.blend(a_frames[-1], b_frames[0], alpha))
    return out


def main():
    import imageio.v2 as imageio

    shots = ["dashboard", "analytics", "transactions", "budgets"]
    imgs = {s: Image.open(os.path.join(APP, f"{s}.png")).convert("RGB") for s in shots}

    seq = []
    seq += still(title_card([("NewFinTech", 96, WHITE)], "Your money, fully understood"), FPS * 2)
    seq += ken_burns(imgs["dashboard"], FPS * 4, zoom_in=True, pan="down")
    seq += ken_burns(imgs["analytics"], FPS * 4, zoom_in=False, pan="right")
    seq += ken_burns(imgs["transactions"], FPS * 3, zoom_in=True, pan="down")
    seq += ken_burns(imgs["budgets"], FPS * 3, zoom_in=False, pan="right")
    seq += still(
        title_card(
            [("Track. Budget. Save.", 72, WHITE)],
            "NewFinTech - Personal Finance Intelligence",
        ),
        FPS * 2,
    )

    # crossfades at the 5 joints
    joints = [FPS * 2, FPS * 6, FPS * 10, FPS * 13, FPS * 16]
    film, prev = [], 0
    for j in joints:
        film.extend(seq[prev:j])
        film.extend(xfade(seq[j - 1 : j], seq[j : j + 1]))
        prev = j + 1
    film.extend(seq[prev:])

    writer = imageio.get_writer(
        OUT, fps=FPS, codec="libx264", quality=8,
        macro_block_size=1, ffmpeg_params=["-pix_fmt", "yuv420p"],
    )
    for f in film:
        writer.append_data(np.asarray(f))
    writer.close()
    size_mb = os.path.getsize(OUT) / 1e6
    print(f"wrote {OUT} ({len(film)/FPS:.1f}s, {size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
