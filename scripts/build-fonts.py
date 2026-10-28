"""Build Siftion UI 1.100 from the project's preserved four-weight baseline.

uv run --with fonttools==4.65.0 --with brotli==1.2.0 --with skia-pathops==0.9.2 python scripts/build-fonts.py
No external font downloads. Originals, cmap, glyph order and layout tables survive.
"""
from pathlib import Path
from copy import deepcopy
import hashlib
import json
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.ttLib.removeOverlaps import removeOverlaps
from fontTools.pens.recordingPen import DecomposingRecordingPen

ROOT = Path(__file__).resolve().parents[1]
STYLES = {'Regular': 400, 'Medium': 500, 'Semibold': 600, 'Bold': 700}
# Promote the existing family's useful alternates, including their accented forms.
# These are baked glyphs, not CSS settings that can silently disappear in other apps.
FEATURES = ('cv01', 'cv02', 'cv05', 'cv08', 'cv09', 'cv11', 'cv12', 'cv13', 'zero')


def signature(font, name):
    glyphs = font.getGlyphSet()
    pen = DecomposingRecordingPen(glyphs)
    glyphs[name].draw(pen)
    return repr(pen.value)


def oval(pen, bounds, clockwise=True, tension=0.64):
    """Four cubic arcs, fuller shoulders than an ellipse, with continuous tangents."""
    left, bottom, right, top = bounds
    cx, cy = (left + right) / 2, (bottom + top) / 2
    rx, ry = (right - left) / 2, (top - bottom) / 2
    k = tension
    if clockwise:
        pen.moveTo((cx, top))
        pen.curveTo((cx + k*rx, top), (right, cy + k*ry), (right, cy))
        pen.curveTo((right, cy-k*ry), (cx+k*rx, bottom), (cx, bottom))
        pen.curveTo((cx-k*rx, bottom), (left, cy-k*ry), (left, cy))
        pen.curveTo((left, cy+k*ry), (cx-k*rx, top), (cx, top))
    else:
        pen.moveTo((cx, top))
        pen.curveTo((cx-k*rx, top), (left, cy+k*ry), (left, cy))
        pen.curveTo((left, cy-k*ry), (cx-k*rx, bottom), (cx, bottom))
        pen.curveTo((cx+k*rx, bottom), (right, cy-k*ry), (right, cy))
        pen.curveTo((right, cy+k*ry), (cx+k*rx, top), (cx, top))
    pen.closePath()


def redraw_round(font, name):
    """Draw full bowls and a clean positive-winding slash in every numeral form."""
    glyph = font['glyf'][name]
    if glyph.isComposite():
        return
    contours = []
    start = 0
    for end in glyph.endPtsOfContours:
        contours.append(list(glyph.coordinates[start:end+1]))
        start = end + 1
    bounds = lambda points: (min(x for x,y in points), min(y for x,y in points),
                             max(x for x,y in points), max(y for x,y in points))
    outer = bounds(contours[0])
    # Upstream slashed zeros already have two separated counters. Reconstruct
    # their shared full counter, then union a newly drawn slash into the bowl.
    inner = bounds([point for contour in contours[1:] for point in contour])
    ttpen = TTGlyphPen(None)
    pen = Cu2QuPen(ttpen, max_err=0.8)
    oval(pen, outer, clockwise=True, tension=0.64)
    oval(pen, inner, clockwise=False, tension=0.62)
    if name.startswith('zero'):
        from math import hypot
        left, bottom, right, top = inner
        width = right-left
        x1, y1 = left+width*.12, bottom
        x2, y2 = right-width*.12, top
        dx, dy = x2-x1, y2-y1
        half = (inner[0]-outer[0]) * .23
        nx, ny = -dy/hypot(dx,dy)*half, dx/hypot(dx,dy)*half
        # Clockwise, like the outer bowl, so the overlap is additive ink.
        pen.moveTo((x1+nx,y1+ny))
        pen.lineTo((x2+nx,y2+ny))
        pen.lineTo((x2-nx,y2-ny))
        pen.lineTo((x1-nx,y1-ny))
        pen.closePath()
    font['glyf'][name] = ttpen.glyph()


def build(style, weight):
    filename = f'SiftionUI-{style}.woff2'
    source_path = ROOT / 'font-src' / 'baseline' / filename
    source = TTFont(source_path, recalcTimestamp=False)
    font = TTFont(source_path, recalcTimestamp=False)
    table = source['GSUB'].table
    promoted = {}
    for feature in table.FeatureList.FeatureRecord:
        if feature.FeatureTag in FEATURES:
            for index in feature.Feature.LookupListIndex:
                for subtable in table.LookupList.Lookup[index].SubTable:
                    promoted.update(subtable.mapping)
    # Snapshot source glyphs, so accented components cannot be double-transformed.
    for base, alternate in promoted.items():
        font['glyf'][base] = deepcopy(source['glyf'][alternate])
        font['hmtx'][base] = source['hmtx'][alternate]

    # Draw these in the font itself. Composites automatically inherit the new bowls.
    rounded = ['o', 'O'] + [name for name in font.getGlyphOrder()
                                if name.startswith('zero') and not font['glyf'][name].isComposite()]
    for name in rounded:
        redraw_round(font, name)
    # Union slash/bowl intersections so there are no knockout seams at joins.
    removeOverlaps(font, glyphNames=rounded, removeHinting=True)

    # Remove obsolete point instructions throughout the family: changed component
    # point indices must never be interpreted by inherited TrueType hint programs.
    for glyph in font['glyf'].glyphs.values():
        glyph.expand(font['glyf'])
        glyph.removeHinting()
    for tag in ('fpgm', 'prep', 'cvt ', 'hdmx', 'LTSH', 'DSIG'):
        if tag in font:
            del font[tag]
    if 'gasp' in font:
        font['gasp'].gaspRange = {65535: 15}

    names = {
        1: 'Siftion UI', 2: style, 3: f'SiftionUI-1.100-{style}',
        4: f'Siftion UI {style}', 5: 'Version 1.100', 6: f'SiftionUI-{style}',
        16: 'Siftion UI', 17: style,
        10: 'Siftion UI, an Inter-derived family. Custom softly rectangular O/o/zero; '
            'single-storey a; unilateral f/t; tailed l; barred I; open 4; flat-top 3. '
            'Upstream outlines and OpenType layout by the Inter Project Authors. '
            'Siftion UI modifications for Sifat Bhatia.'
    }
    # Retain original copyright, designer credit, license and feature labels.
    # Remove the upstream trademark record rather than imply this is an Inter release.
    font['name'].removeNames(nameID=7)
    for name_id, value in names.items():
        font['name'].removeNames(nameID=name_id)
        font['name'].setName(value, name_id, 3, 1, 0x409)
        font['name'].setName(value, name_id, 1, 0, 0)
    font['head'].fontRevision = 1.1
    font['OS/2'].usWeightClass = weight
    font['OS/2'].fsSelection &= ~((1 << 0) | (1 << 5) | (1 << 6))
    font['OS/2'].fsSelection |= (1 << 5) if weight == 700 else (1 << 6)
    font['head'].macStyle = 1 if weight == 700 else 0
    # maxp instruction maxima are recomputed below after stripping hints.
    font['maxp'].maxSizeOfInstructions = 0
    font['maxp'].maxZones = 1
    font['maxp'].maxTwilightPoints = 0
    font['maxp'].maxStorage = 0
    font['maxp'].maxFunctionDefs = 0
    font['maxp'].maxInstructionDefs = 0
    font['maxp'].maxStackElements = 0
    font.flavor = 'woff2'
    output = ROOT / 'assets' / filename
    font.save(output)
    rebuilt = TTFont(output)
    changed = [name for name in source.getGlyphOrder()
               if signature(source, name) != signature(rebuilt, name)]
    print(f'{style}: rebuilt {filename}, {len(changed)} changed outlines, {output.stat().st_size} bytes')
    return {'style': style, 'weight': weight, 'source_sha256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
            'output_sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
            'changed_glyphs': changed, 'promoted_alternates': promoted,
            'codepoints': len(rebuilt.getBestCmap()), 'glyphs': len(rebuilt.getGlyphOrder())}


if __name__ == '__main__':
    report = [build(style, weight) for style, weight in STYLES.items()]
    (ROOT / 'font-src' / 'build-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
