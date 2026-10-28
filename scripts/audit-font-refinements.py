"""Read-only audit of approved fonts; outputs evidence, not replacement binaries.
uv run --with fonttools --with brotli --with uharfbuzz python scripts/audit-font-refinements.py
"""
from pathlib import Path
from io import BytesIO
import json
import hashlib
import string
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'font-src' / 'refinement-audit'
OUT.mkdir(exist_ok=True)
FEATURES = {'cv11':'a', 'cv05':'l', 'cv08':'I', 'cv12':'f', 'cv13':'t', 'cv01':'1', 'cv02':'4', 'cv09':'3', 'zero':'0'}
report = []
for path in sorted((ROOT/'assets').glob('*.woff2')):
    tt = TTFont(path)
    tt.flavor = None
    stream = BytesIO()
    tt.save(stream)
    font = hb.Font(hb.Face(stream.getvalue()))
    hb.ot_font_set_funcs(font)
    order = tt.getGlyphOrder()
    glyphset = tt.getGlyphSet()
    cache = {}
    def outline(gid):
        if gid not in cache:
            pen = DecomposingRecordingPen(glyphset)
            glyphset[order[gid]].draw(pen)
            cache[gid] = hashlib.sha256(repr(pen.value).encode()).hexdigest()
        return cache[gid]
    def shape(text, features=None):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(font, buf, features or {})
        return [{'glyph':order[i.codepoint], 'outline':outline(i.codepoint), 'advance':p.x_advance,
                 'x':p.x_offset, 'y':p.y_offset} for i,p in zip(buf.glyph_infos,buf.glyph_positions)]
    differences = []
    for feature, letter in FEATURES.items():
        pairs = sorted({c+letter for c in string.ascii_letters+string.digits} | {letter+c for c in string.ascii_letters+string.digits})
        for text in pairs:
            a,b = shape(text),shape(text,{feature:1})
            if [g['outline'] for g in a] == [g['outline'] for g in b]:
                delta = sum(g['advance'] for g in b)-sum(g['advance'] for g in a)
                if delta or [(g['x'],g['y']) for g in a] != [(g['x'],g['y']) for g in b]:
                    differences.append({'feature':feature,'text':text,'advance_delta':delta,'default':a,'feature_on':b})
    marks=[]
    for feature,letter in FEATURES.items():
        if not letter.isalpha(): continue
        for mark in ['\u030d','\u030f','\u0323','\u0327','\u0308','\u0301']:
            text=letter+mark
            a,b=shape(text),shape(text,{feature:1})
            if [g['outline'] for g in a] == [g['outline'] for g in b] and [(g['x'],g['y']) for g in a] != [(g['x'],g['y']) for g in b]:
                marks.append({'text':text,'feature':feature,'default':a,'feature_on':b})
    row={'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
         'pair_differences':differences,'mark_differences':marks}
    report.append(row)
    print(path.name, 'pair inconsistencies:',len(differences),'mark inconsistencies:',len(marks))
    for d in sorted(differences,key=lambda x:abs(x['advance_delta']),reverse=True)[:6]:
        print(' ',d['feature'],d['text'],d['advance_delta'])
    for d in marks[:3]:
        print(' mark',ascii(d['text']),d['default'],d['feature_on'])
(OUT/'feature-audit.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
