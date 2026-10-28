"""Validate the simplified palette and unchanged approved webfonts."""
from pathlib import Path
import json
import re
import hashlib

ROOT = Path(__file__).resolve().parents[1]

def check():
    tokens = (ROOT/'styles/tokens.css').read_text(encoding='utf-8')
    components = (ROOT/'styles/components.css').read_text(encoding='utf-8')
    exported = json.loads((ROOT/'tokens.json').read_text(encoding='utf-8'))
    assert '--sf-acid' not in tokens and 'data-mode="acid"' not in tokens, 'acid token/theme remains'
    assert '--sf-acid' not in components and 'sf-swatch--acid' not in components, 'acid library reference remains'
    assert 'acid' not in exported['color'], 'acid remains in token export'
    assert '--sf-violet: #cdbbff' in tokens and exported['color']['violet']=='#cdbbff', 'reserved violet must remain available'
    sources = [(ROOT/f).read_text(encoding='utf-8') for f in ['index.html','styles/showcase.css','scripts/showcase.js']]
    assert all(not re.search(r'\bacid\b|#c9ff36|--sf-violet|#cdbbff|value="violet"',s,re.I) for s in sources), 'retired accent remains in showcase'
    html = sources[0]
    assert set(re.findall(r'name="palette"\s+value="([^"]+)"',html)) == {'paper','ink','signal','hot'}, 'showcase must have four active swatches'
    for row in json.loads((ROOT/'font-src/build-report.json').read_text(encoding='utf-8')):
        path = ROOT/'assets'/f"SiftionUI-{row['style']}.woff2"
        assert hashlib.sha256(path.read_bytes()).hexdigest() == row['output_sha256'], 'approved font changed'
    print('PASS: acid removed; four active swatches; violet reserved; all four approved fonts unchanged')

if __name__ == '__main__':
    check()
