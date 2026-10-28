"""Check scoped semantic-color polish; optionally protect an explicit hero baseline.

Run: uv run --with playwright python scripts/check-color-polish.py
Pass --baseline PATH or set SIFTION_COLOR_BASELINE to a preserved repository
snapshot containing index.html and styles/showcase.css. Relative paths are
resolved from the project root. Without a baseline, hero comparisons are
reported as skipped, never passed; all browser behavior assertions still run.
"""
from pathlib import Path
import argparse
import json
import os
import re
from playwright.sync_api import sync_playwright, expect
from browser_support import base_url, launch_browser

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'verification/color-polish'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--baseline', default=os.environ.get('SIFTION_COLOR_BASELINE'),
                    help='Preserved repository directory; defaults to SIFTION_COLOR_BASELINE')
args = parser.parse_args()
checks = []
skipped = []
baseline = {'status': 'skipped', 'path': None}
hero_classes = re.compile(r'\.sx-(?:hero|rail|layout-preview|masthead|glyph|reading|shape|chapter|ui-stamp|tile|specimen-next)')


def hero(markup):
    start = markup.index('    <section class="sx-shell sx-hero"')
    end = markup.index('    <section class="sx-shell sx-section sx-type-section"', start)
    return markup[start:end]


def hero_rules(css):
    rules = []
    for selector, body in re.findall(r'([^{}]+)\{([^{}]*)\}', css):
        if not hero_classes.search(selector):
            continue
        selector = selector.strip()
        # Keep the existing allowance for the intentional masthead offset.
        if selector == '.sx-masthead':
            body = re.sub(r'\s+', '', body).replace('margin-top:-35px;', '')
        else:
            body = body.strip()
        rules.append((selector, body))
    return rules


if args.baseline is not None:
    if not args.baseline.strip():
        parser.error('Baseline must name a preserved directory, not an empty value')
    directory = Path(os.path.expandvars(args.baseline)).expanduser()
    if not directory.is_absolute():
        directory = ROOT / directory
    directory = directory.resolve()
    if directory == ROOT:
        parser.error('Baseline must be a preserved snapshot, not the current project root')
    for relative in ('index.html', 'styles/showcase.css'):
        if not (directory / relative).is_file():
            parser.error(f'Baseline is missing {relative}: {directory}')
    before = (directory / 'index.html').read_text(encoding='utf-8')
    after = (ROOT / 'index.html').read_text(encoding='utf-8')
    assert hero(before) == hero(after), 'approved hero markup changed'
    before_rules = hero_rules((directory / 'styles/showcase.css').read_text(encoding='utf-8'))
    after_rules = hero_rules((ROOT / 'styles/showcase.css').read_text(encoding='utf-8'))
    assert before_rules, 'baseline contains no approved hero styling rules'
    assert before_rules == after_rules, 'approved hero styling changed'
    checks.extend(['approved hero markup unchanged', 'approved hero styling unchanged'])
    baseline = {'status': 'passed', 'path': str(directory)}
else:
    reason = 'No baseline supplied; pass --baseline PATH or set SIFTION_COLOR_BASELINE'
    skipped.extend(['approved hero markup comparison', 'approved hero styling comparison'])
    baseline['reason'] = reason
    print(f'SKIPPED: hero baseline comparisons. {reason}')

OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = launch_browser(p)
    page=b.new_page(viewport={'width':1440,'height':1000})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base_url())
    page.evaluate('()=>document.fonts.ready')
    for theme in ['night','light']:
        page.evaluate('(theme)=>{document.documentElement.dataset.mode=theme;localStorage.setItem("siftion-showcase:mode",theme)}',theme)
        page.reload();page.evaluate('()=>document.fonts.ready')
        page.locator('[data-tab="buttons"]').click()
        primary=page.locator('[data-demo-button="primary"]')
        assert primary.evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(63, 77, 255)', 'primary action must use signal'
        assert primary.evaluate('(e)=>getComputedStyle(e).color')=='rgb(255, 255, 255)', 'signal requires white text'
        assert page.locator('[data-demo-button="signal"]').evaluate('(e)=>getComputedStyle(e).backgroundColor')!='rgb(63, 77, 255)', 'secondary must not compete with primary'
        checks.append(theme+' action hierarchy')
        page.locator('[data-tab="choices"]').click()
        switch=page.locator('#panel-choices input[role="switch"]').first
        switch.check()
        expect(page.locator('#panel-choices .sf-switch__track').first).to_have_css('background-color','rgb(63, 77, 255)')
        checks.append(theme+' selected controls use signal')
        page.locator('[data-tab="states"]').click()
        page.locator('input[name="feedback-state"][value="attention"]').check()
        status=page.locator('[data-state-preview]')
        expect(status).to_have_attribute('data-state','attention')
        assert status.evaluate('(e)=>getComputedStyle(e).borderLeftColor')=='rgb(255, 101, 71)'
        page.locator('input[name="feedback-state"][value="waiting"]').check()
        expect(status).to_have_attribute('data-state','waiting')
        checks.append(theme+' hot warning and neutral waiting')
        page.locator('[data-tab="inputs"]').click()
        page.locator('#example-name').fill('')
        page.locator('[data-example-form] button[type="submit"]').click()
        expect(page.locator('#example-name')).to_have_css('border-bottom-color','rgb(255, 101, 71)')
        expect(page.locator('#example-error')).to_be_visible()
        checks.append(theme+' invalid field marked with hot and text')
        for key in ['paper','ink','signal','hot']:
            radio=page.locator(f'input[name="palette"][value="{key}"]')
            radio.check()
            for selector in [f'input[name="palette"][value="{key}"] + .sx-swatch-face','[data-color-stage]']:
                border=page.locator(selector).evaluate('(e)=>({width:getComputedStyle(e).borderTopWidth,style:getComputedStyle(e).borderTopStyle,color:getComputedStyle(e).borderTopColor,bg:getComputedStyle(e).backgroundColor})')
                assert border['width']=='1px' and border['style']=='solid' and border['color']!=border['bg'],border
        checks.append(theme+' all four swatches and preview boundaries visible')
        page.locator('#color').screenshot(path=str(OUT/f'color-{theme}.png'))
        page.locator('[data-tab="buttons"]').click()
        page.locator('#components').screenshot(path=str(OUT/f'components-{theme}.png'))
        page.locator('[data-tab="states"]').click();page.locator('input[name="feedback-state"][value="attention"]').check()
        page.locator('#components').screenshot(path=str(OUT/f'warning-{theme}.png'))
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.locator('#components').screenshot(path=str(OUT/f'mobile-{theme}.png'))
        page.set_viewport_size({'width':1440,'height':1000})
    assert not errors,errors
    b.close()
report = {'checks': checks, 'errors': errors, 'baseline': baseline, 'skipped': skipped}
(OUT/'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, indent=2))
