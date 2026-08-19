#!/usr/bin/env python3
"""Rasterise the shinux brand assets from their committed SVG sources.

Run from the repo root after editing any of the sources:

    python3 scripts/make-brand-assets.py

Every source SVG has its text baked into vector outlines, so this needs no
fonts installed — only `inkscape` (SVG -> PNG) and ImageMagick (the .ico
packer, which is the part that can hold a different drawing per size).
Never hand-edit the generated PNGs; change the SVG and re-run this instead.

Sources
  public/icon.svg              the primary mark: rounded terminal tile + "sh_"
  public/icon-maskable.svg     full-bleed variant for Android adaptive masks
  public/apple-icon-src.svg    iOS home-screen tile
  scripts/brand/og-card.svg    the 1200x630 link-preview card
  scripts/brand/favicon-16-src.svg
      A deliberately simplified mark for the 16px favicon layer: no inner
      stroke, no cursor, letters filling the tile. The full "sh_" lockup turns
      to mush at that size.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# (source, destination, pixel size)
RASTERS = [
    ("public/icon.svg", "public/icon-192.png", 192),
    ("public/icon.svg", "public/icon-512.png", 512),
    ("public/icon-maskable.svg", "public/icon-maskable-512.png", 512),
    ("public/apple-icon-src.svg", "public/apple-icon.png", 180),
    ("scripts/brand/og-card.svg", "src/app/opengraph-image.png", 1200),
]

# The .ico carries three layers; 16px gets the simplified art.
ICO_LAYERS = [
    ("scripts/brand/favicon-16-src.svg", 16),
    ("public/icon.svg", 32),
    ("public/icon.svg", 48),
]
# Next serves src/app/favicon.ico at /favicon.ico; public/ keeps a copy so the
# file is still there for anything referencing it directly.
ICO_TARGETS = ["src/app/favicon.ico", "public/favicon.ico"]


def render(src: Path, dst: Path, width: int, height: int | None = None) -> None:
    cmd = ["inkscape", str(src), "-o", str(dst), "-w", str(width)]
    if height is not None:
        cmd += ["-h", str(height)]
    subprocess.run(cmd, check=True, capture_output=True)


def main() -> int:
    magick = shutil.which("magick") or shutil.which("convert")
    if shutil.which("inkscape") is None or magick is None:
        print("error: needs inkscape and ImageMagick "
              "(dnf install inkscape ImageMagick)", file=sys.stderr)
        return 1

    for src, dst, size in RASTERS:
        # The OG card is the only non-square asset.
        height = 630 if size == 1200 else size
        render(ROOT / src, ROOT / dst, size, height)
        print(f"  {dst}  ({size}x{height})")

    # Pillow's ICO writer resizes one image into every layer, which would throw
    # away the simplified 16px drawing — ImageMagick packs distinct files.
    tmp = ROOT / "scripts" / "brand" / ".ico-layers"
    tmp.mkdir(exist_ok=True)
    layers = []
    for src, size in ICO_LAYERS:
        png = tmp / f"{size}.png"
        render(ROOT / src, png, size, size)
        layers.append(str(png))
    for target in ICO_TARGETS:
        subprocess.run([magick, *layers, str(ROOT / target)],
                       check=True, capture_output=True)
        sizes = ", ".join(f"{s}x{s}" for _, s in ICO_LAYERS)
        print(f"  {target}  ({sizes})")
    shutil.rmtree(tmp)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
