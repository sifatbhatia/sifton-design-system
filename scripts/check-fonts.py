"""Regression check: the shipped family must contain actual outline changes.
Run: uv run --with fonttools --with brotli python scripts/check-fonts.py
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen

ROOT = Path(__file__).resolve().parents[1]
WEIGHTS = {'Regular': 400, 'Medium': 500, 'Semibold': 600, 'Bold': 700}


def outline(font, name):
    glyphs = font.getGlyphSet()
    pen = DecomposingRecordingPen(glyphs)
    glyphs[name].draw(pen)
    return pen.value


def check():
    failures = []
    for style, weight in WEIGHTS.items():
        filename = f'SiftionUI-{style}.woff2'
        source = TTFont(ROOT / 'font-src' / 'baseline' / filename)
        font = TTFont(ROOT / 'assets' / filename)
        changed = [g for g in ['a', 'f', 't', 'l', 'I', 'o', 'O', 'three', 'four']
                   if outline(font, g) != outline(source, g)]
        missing = set(['a', 'f', 't', 'l', 'I', 'o', 'O', 'three', 'four']) - set(changed)
        if missing:
            failures.append(f'{style}: unchanged signature glyphs: {sorted(missing)}')
        for name in ('zero.tf', 'zero.slash', 'zero.tf.slash', 'zero.sups.slash', 'zero.dnom.slash'):
            if outline(font, name) == outline(source, name):
                failures.append(f'{style}: numeral feature reverts to old bowl: {name}')
        if font['name'].getDebugName(3) != f'SiftionUI-1.100-{style}':
            failures.append(f'{style}: stale unique font ID')
        assert font['OS/2'].usWeightClass == weight, f'{style}: wrong weight'
        assert font.getBestCmap() == source.getBestCmap(), f'{style}: character coverage changed'
        assert font.getGlyphOrder() == source.getGlyphOrder(), f'{style}: glyph order changed'
        assert 'GPOS' in font and 'GSUB' in font and 'GDEF' in font
        assert font['name'].getDebugName(0) == source['name'].getDebugName(0), 'retain upstream copyright'
        assert font['name'].getDebugName(13) == source['name'].getDebugName(13), 'retain OFL'
        print(f'{style}: {len(changed)}/9 signature glyphs changed, {len(font.getBestCmap())} codepoints, weight {weight}')
    assert not failures, '\n' + '\n'.join(failures)
    print('PASS: all four fonts have real outline changes, correct identity, and retained coverage.')


if __name__ == '__main__':
    check()
