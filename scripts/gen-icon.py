#!/usr/bin/env python3
"""L'icône provisoire : un G en Newsreader, marron sur ivoire.

Provisoire au sens propre — la vraie icône reste à dessiner (feuille de route,
point 6). Ce script existe pour qu'elle soit reproductible en attendant, et pour
que la changer de couleur soit une ligne à éditer plutôt qu'un passage dans un
logiciel de dessin.

    npm run gen:icon

Il faut Python 3 et Pillow. La police vient de @expo-google-fonts/newsreader,
donc `npm install` doit avoir tourné avant.
"""

from pathlib import Path
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("Pillow manque : python3 -m pip install Pillow")

ROOT = Path(__file__).resolve().parent.parent

SIZE = 1024
IVORY = (245, 239, 227)  # #F5EFE3
BROWN = (168, 86, 8)  # #A85608
FONT = ROOT / "node_modules/@expo-google-fonts/newsreader/500Medium/Newsreader_500Medium.ttf"
OUT = ROOT / "assets/icon.png"

if not FONT.exists():
    sys.exit(f"Police introuvable : {FONT}\nLance `npm install` d'abord.")


def main() -> None:
    image = Image.new("RGB", (SIZE, SIZE), IVORY)
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(str(FONT), 660)

    # On centre sur l'encre, pas sur les métriques de la police : un G à
    # empattements a beaucoup de approche, et centrer la boîte le laisserait
    # visiblement décalé vers la gauche.
    left, top, right, bottom = draw.textbbox((0, 0), "G", font=font)
    width, height = right - left, bottom - top
    draw.text(
        ((SIZE - width) / 2 - left, (SIZE - height) / 2 - top),
        "G",
        font=font,
        fill=BROWN,
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT)
    print(f"{OUT.relative_to(ROOT)} écrit — G de {width}x{height} px")


if __name__ == "__main__":
    main()
