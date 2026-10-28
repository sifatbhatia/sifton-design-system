# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools==4.65.0", "brotli==1.2.0"]
# ///
"""Generate brand SVGs from the approved Siftion UI outlines, without changing fonts.

SVG only: uv run scripts/build-brand-assets.py
SVG + OG PNG: uv run --with resvg-py==0.5.0 scripts/build-brand-assets.py --png
Use --output-dir PATH to generate outside assets/; relative paths use the project root.
The optional resvg renderer ships native wheels for Windows, macOS, and Linux;
no browser, system font, or Cairo installation is required. The 1200x630 PNG is
rendered from the same path-only SVG with pinned tooling and no system fonts.
Nothing is written on import. Generating the PNG is opt-in and fails explicitly
if its pinned renderer is unavailable (before any assets are overwritten).
"""
from pathlib import Path
import argparse
from importlib.metadata import version

ROOT = Path(__file__).resolve().parents[1]
RENDERER_VERSION = '0.5.0'


def brand_svgs():
    """Return the existing artwork as SVG strings with glyphs drawn as paths."""
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen

    with TTFont(ROOT / 'assets/SiftionUI-Medium.woff2', recalcTimestamp=False) as font:
        glyphs = font.getGlyphSet()
        cmap = font.getBestCmap()

        def paths(text, size, x, y):
            scale = size / font['head'].unitsPerEm
            parts = []
            for char in text:
                name = cmap[ord(char)]
                pen = SVGPathPen(glyphs)
                glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, y)))
                parts.append('<path d="' + pen.getCommands() + '"/>')
                x += font['hmtx'][name][0] * scale
            return ''.join(parts)

        favicon = (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
            '<rect width="64" height="64" rx="12" fill="#151515"/>'
            '<g fill="#efeee9">' + paths('S', 57, 14, 53) + '</g></svg>'
        )
        card = (
            '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">'
            '<rect width="1200" height="630" fill="#151515"/><g fill="#efeee9">'
            + paths('Siftion UI', 190, 66, 335)
            + paths('type, components, and motion.', 30, 72, 493)
            + '</g><path d="M72 429H1128" stroke="#efeee9" stroke-opacity=".2"/>'
            '<g fill="#aaa89f">' + paths('by sifat bhatia', 22, 72, 90) + '</g></svg>'
        )
    return {'favicon.svg': favicon, 'social-card.svg': card}


def render_png(svg):
    """Render with a single pinned native renderer, never a browser fallback."""
    import resvg_py

    installed = version('resvg-py')
    if installed != RENDERER_VERSION:
        raise RuntimeError(f'PNG generation requires resvg-py=={RENDERER_VERSION}; found {installed}')
    return resvg_py.svg_to_bytes(
        svg_string=svg, width=1200, height=630, dpi=96.0,
        skip_system_fonts=True, shape_rendering='geometric_precision',
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--png', action='store_true', help='Also generate social-card.png for OG metadata')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'assets',
                        help='Output directory (default: project assets/); fonts are read-only')
    args = parser.parse_args()
    output = args.output_dir.expanduser()
    if not output.is_absolute():
        output = ROOT / output

    artwork = brand_svgs()
    png = None
    if args.png:
        try:
            png = render_png(artwork['social-card.svg'])
        except ImportError as error:
            parser.error(
                f'PNG renderer unavailable: {error}. Run '
                f'`uv run --with resvg-py=={RENDERER_VERSION} scripts/build-brand-assets.py --png`'
            )
        except (RuntimeError, ValueError) as error:
            parser.error(str(error))

    output.mkdir(parents=True, exist_ok=True)
    for name, svg in artwork.items():
        (output / name).write_text(svg, encoding='utf-8', newline='\n')
        print(f'Generated {output / name}')
    if png is not None:
        (output / 'social-card.png').write_bytes(png)
        print(f'Generated {output / "social-card.png"} (1200x630, resvg-py {RENDERER_VERSION})')
    else:
        print('SKIPPED: social-card.png; pass --png with the optional pinned resvg-py dependency')


if __name__ == '__main__':
    main()
