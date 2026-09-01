# -*- coding: utf-8 -*-
"""Genera tutte le icone della PWA "JW comitive".

Due modi d'uso:

1. Senza far nulla:  python tools/make_icons.py
   Disegna il marchio (fondo blu notte + scritta argento) da zero.

2. Con il logo vero: salva la tua immagine in  tools/logo-source.png
   e poi lancia lo stesso comando. Lo script la ritaglia quadrata e la
   ridimensiona in tutte le misure che servono, senza ridisegnare niente.

Serve solo Pillow:  python -m pip install pillow
"""

import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ICONS = os.path.join(ROOT, "icons")
SOURCE = os.path.join(HERE, "logo-source.png")

SIZE = 1024
TOP = (48, 74, 104)      # blu del logo, in alto
BOTTOM = (18, 33, 50)    # blu piu' scuro, in basso
SILVER = (238, 241, 244)
SILVER_SOFT = (196, 206, 216)

FONT_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
FONT_REG = r"C:\Windows\Fonts\arial.ttf"


def load_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def gradient_background():
    """Sfondo blu con sfumatura verticale, alone di luce e grana leggera."""
    bg = Image.new("RGB", (SIZE, SIZE))
    draw = ImageDraw.Draw(bg)
    for y in range(SIZE):
        t = y / (SIZE - 1)
        draw.line(
            [(0, y), (SIZE, y)],
            fill=tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3)),
        )

    # Alone di luce diffusa in alto a sinistra, come sul logo originale.
    glow = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(glow).ellipse(
        [-SIZE * 0.35, -SIZE * 0.55, SIZE * 0.95, SIZE * 0.65], fill=70
    )
    glow = glow.filter(ImageFilter.GaussianBlur(SIZE * 0.16))
    bg = Image.composite(Image.new("RGB", (SIZE, SIZE), (86, 116, 148)), bg, glow)

    # Grana: il logo ha una superficie tipo tessuto, non un blu piatto.
    rnd = random.Random(7)
    noise = Image.new("L", (SIZE, SIZE))
    noise.putdata([rnd.randint(112, 143) for _ in range(SIZE * SIZE)])
    bg = Image.blend(bg, Image.merge("RGB", (noise, noise, noise)), 0.055)

    # Vignettatura sui bordi, per dare profondita'.
    vign = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(vign).ellipse(
        [-SIZE * 0.22, -SIZE * 0.22, SIZE * 1.22, SIZE * 1.22], fill=255
    )
    vign = vign.filter(ImageFilter.GaussianBlur(SIZE * 0.10))
    return Image.composite(bg, Image.new("RGB", (SIZE, SIZE), (10, 20, 31)), vign)


def engraved_text(img, xy, text, font, fill):
    """Scritta in rilievo: ombra sotto, filo di luce sopra, poi il testo."""
    x, y = xy
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.text((x + 7, y + 9), text, font=font, fill=(6, 14, 22, 150), anchor="mm")
    layer = layer.filter(ImageFilter.GaussianBlur(6))
    img.alpha_composite(layer)

    d = ImageDraw.Draw(img)
    d.text((x - 2, y - 3), text, font=font, fill=(255, 255, 255, 70), anchor="mm")
    d.text((x, y), text, font=font, fill=fill + (255,), anchor="mm")


def build_master():
    """Il marchio disegnato: JW grande, 'comitive' sotto."""
    img = gradient_background().convert("RGBA")
    engraved_text(img, (SIZE // 2, 452), "JW", load_font(FONT_BOLD, 430), SILVER)
    engraved_text(img, (SIZE // 2, 762), "comitive", load_font(FONT_REG, 152), SILVER_SOFT)
    return img.convert("RGB")


def from_source():
    """Il logo fornito dall'utente, ritagliato quadrato al centro."""
    img = Image.open(SOURCE).convert("RGB")
    side = min(img.size)
    left = (img.width - side) // 2
    top = (img.height - side) // 2
    return img.crop((left, top, left + side, top + side)).resize(
        (SIZE, SIZE), Image.LANCZOS
    )


def maskable(master):
    """Versione per Android: il marchio rimpicciolito dentro l'area sicura."""
    canvas = gradient_background()
    inner = round(SIZE * 0.62)
    canvas.paste(master.resize((inner, inner), Image.LANCZOS), ((SIZE - inner) // 2,) * 2)
    return canvas


def main():
    os.makedirs(ICONS, exist_ok=True)
    if os.path.exists(SOURCE):
        master = from_source()
        print("Uso il logo di tools/logo-source.png")
    else:
        master = build_master()
        print("Nessun tools/logo-source.png: disegno io il marchio")

    for name, size in [
        ("icon-512.png", 512),
        ("icon-192.png", 192),
        ("apple-touch-icon.png", 180),
        ("favicon.png", 64),
    ]:
        master.resize((size, size), Image.LANCZOS).save(
            os.path.join(ICONS, name), optimize=True
        )
        print(" ", name)

    maskable(master).resize((512, 512), Image.LANCZOS).save(
        os.path.join(ICONS, "icon-maskable-512.png"), optimize=True
    )
    print("  icon-maskable-512.png")

    # Copia grande: e' quella che finisce sulla locandina da condividere.
    master.save(os.path.join(ICONS, "logo-1024.png"), optimize=True)
    print("  logo-1024.png")


if __name__ == "__main__":
    main()
