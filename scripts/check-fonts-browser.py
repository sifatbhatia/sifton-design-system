"""Exercise font delivery, actual platform font selection and weight controls.
Run: uv run --with playwright python scripts/check-fonts-browser.py
Requires a running project server; configure SIFTION_BASE_URL (see browser_support.py).
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
from browser_support import base_url, launch_browser

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'font-src' / 'verification'
OUT.mkdir(parents=True, exist_ok=True)
BASE = base_url()
errors = []
results = []
with sync_playwright() as p:
    browser = launch_browser(p)
    page = browser.new_page(viewport={'width': 1440, 'height': 1100}, device_scale_factor=1)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'favicon' not in m.text else None)
    response = page.goto(BASE + 'index.html')
    assert response.status == 200
    for weight in [400, 500, 600, 700]:
        assert page.evaluate("""async (w) => {
            const faces = await document.fonts.load(`${w} 40px "Siftion UI"`, 'Siftion UI');
            return faces.length === 1 && faces[0].status === 'loaded';
        }""", weight), f'weight {weight} did not load'
        page.locator(f'input[name="hero-weight"][value="{weight}"]').check()
        page.locator(f'input[name="type-weight"][value="{weight}"]').check()
        assert page.locator('#type-specimen').evaluate('(el) => getComputedStyle(el).fontWeight') == str(weight)
        cdp = page.context.new_cdp_session(page)
        root = cdp.send('DOM.getDocument')['root']['nodeId']
        node = cdp.send('DOM.querySelector', {'nodeId': root, 'selector': '[data-hero-glyph]'})['nodeId']
        cdp.send('CSS.enable')
        fonts = cdp.send('CSS.getPlatformFontsForNode', {'nodeId': node})['fonts']
        assert fonts and all(f['isCustomFont'] and f['familyName'] == 'Siftion UI' for f in fonts), fonts
        assert any(f['postScriptName'] == 'SiftionUI-' + {400:'Regular',500:'Medium',600:'Semibold',700:'Bold'}[weight] for f in fonts), fonts
        results.append({'weight': weight, 'platform_fonts': fonts})
        cdp.detach()
    page.locator('input[name="hero-weight"][value="400"]').check()
    for width in [1440, 390, 320]:
        page.set_viewport_size({'width': width, 'height': 1100})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'overflow at {width}'
        page.screenshot(path=str(OUT / f'showcase-{width}.png'), full_page=(width==1440))
    page.goto(BASE + 'font-proof.html')
    page.set_viewport_size({'width':1440,'height':1100})
    for weight in [400,500,600,700]:
        page.locator(f'[data-weight="{weight}"]').click()
        page.evaluate('() => document.fonts.ready')
        page.screenshot(path=str(OUT / f'proof-{weight}.png'), full_page=True)
    resources = page.evaluate("performance.getEntriesByType('resource').filter(r=>r.name.includes('.woff2')).map(r=>({url:r.name,bytes:r.decodedBodySize}))")
    assert len(resources) == 8 and all(r['bytes'] > 0 for r in resources), resources
    browser.close()
# A static server's optional favicon 404 is not a font or app failure.
errors = [e for e in errors if '404 (File not found)' not in e]
assert not errors, errors
report = {'weights': results, 'widths': [1440,390,320], 'font_resources': resources, 'errors': errors}
(OUT / 'browser-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
print('PASS: four real Siftion UI webfonts rendered; weight controls and three viewport widths verified.')
