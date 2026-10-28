"""Browser verification for the live Siftion UI showcase.
Run: uv run --with playwright python scripts/check-showcase.py
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright, expect
from browser_support import base_url, launch_browser

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'verification'/'showcase'
OUT.mkdir(parents=True, exist_ok=True)
BASE = base_url()
checks = []
errors = []
http_errors = []

with sync_playwright() as p:
    browser = launch_browser(p)
    context = browser.new_context(viewport={'width':1440,'height':1000}, color_scheme='light')
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('response', lambda r: http_errors.append({'url':r.url,'status':r.status}) if r.status>=400 and not r.url.endswith('favicon.ico') else None)
    assert page.goto(BASE).status == 200
    page.evaluate('() => document.fonts.ready')
    original = page.locator('#type-specimen').input_value()
    for weight,style in [(400,'Regular'),(500,'Medium'),(600,'Semibold'),(700,'Bold')]:
        page.locator(f'input[name="type-weight"][value="{weight}"]').check()
        assert page.locator('#type-specimen').evaluate('(el)=>getComputedStyle(el).fontWeight') == str(weight)
        assert page.evaluate('async w => (await document.fonts.load(`${w} 40px "Siftion UI"`)).length===1',weight)
        page.locator(f'input[name="hero-weight"][value="{weight}"]').check()
        assert page.locator('[data-hero-glyph]').evaluate('(el)=>getComputedStyle(el).fontWeight') == str(weight)
        checks.append(f'font weight {weight}')
    cdp = context.new_cdp_session(page)
    cdp.send('DOM.enable'); cdp.send('CSS.enable')
    root = cdp.send('DOM.getDocument')['root']['nodeId']
    node = cdp.send('DOM.querySelector',{'nodeId':root,'selector':'[data-hero-glyph]'})['nodeId']
    fonts = cdp.send('CSS.getPlatformFontsForNode',{'nodeId':node})['fonts']
    assert fonts and all(f['isCustomFont'] and f['familyName']=='Siftion UI' for f in fonts), fonts
    page.locator('#type-specimen').fill('Siftion UI. A working specimen.')
    page.locator('#type-size').fill('80')
    page.locator('#type-size').dispatch_event('input')
    assert '80' in page.locator('#type-size-output').inner_text()
    page.locator('[data-reset-type]').click()
    assert page.locator('#type-specimen').input_value() == original
    expect(page.locator('input[name="type-weight"][value="500"]')).to_be_checked()
    checks.append('type edit, size, reset')
    assert page.locator('input[name="palette"]').count()==4
    for key,color in [('paper','#efeee9'),('ink','#151515'),('signal','#3f4dff'),('hot','#ff6547')]:
        page.locator(f'input[name="palette"][value="{key}"]').check()
        assert color in page.locator('[data-color-code]').inner_text().lower()
        assert float(page.locator('[data-color-contrast]').inner_text().split(':')[0])>=4.5
        checks.append(f'{key} palette preview and contrast')
    # Exercise denied clipboard path without requiring access to the user's clipboard.
    page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('denied'))}})")
    page.locator('[data-copy-color]').click()
    expect(page.locator('[data-copy-dialog]')).to_be_visible()
    assert '--sf-hot: #ff6547;' in page.locator('#manual-copy').input_value()
    page.locator('[data-close-dialog]').first.click()
    checks.append('color copy fallback')
    page.locator('[data-tab="buttons"]').click()
    page.locator('[data-tab="buttons"]').focus()
    page.keyboard.press('ArrowRight')
    expect(page.locator('[data-tab="inputs"]')).to_have_attribute('aria-selected','true')
    page.locator('#example-name').fill('')
    page.locator('[data-example-form] button[type="submit"]').click()
    expect(page.locator('#example-name')).to_have_attribute('aria-invalid','true')
    page.locator('#example-name').fill('A small idea')
    page.locator('[data-example-form] button[type="submit"]').click()
    assert 'A small idea' in page.locator('[data-form-feedback]').inner_text()
    page.locator('[data-example-form] button[type="reset"]').click()
    assert page.locator('#example-name').input_value()==''
    page.locator('[data-tab="states"]').click()
    page.locator('input[name="feedback-state"][value="attention"]').check()
    assert 'attention' in page.locator('[data-state-preview]').inner_text().lower()
    page.locator('[data-copy-component]').click()
    expect(page.locator('[data-copy-dialog]')).to_be_visible()
    assert 'role="status"' in page.locator('#manual-copy').input_value()
    page.locator('[data-close-dialog]').first.click()
    checks.append('keyboard tabs, validation, save/reset, states and copy')
    page.locator('[data-motion-toggle]').click()
    expect(page.locator('[data-motion-toggle]')).to_have_attribute('aria-pressed','true')
    page.locator('[data-motion-toggle]').click()
    expect(page.locator('[data-motion-toggle]')).to_have_attribute('aria-pressed','false')
    page.locator('[data-rearrange]').click()
    expect(page.locator('[data-rearrange]')).to_have_attribute('aria-pressed','true')
    page.locator('[data-rearrange]').click()
    checks.append('motion and composition controls')
    for theme in ['light','night']:
        if page.locator('html').get_attribute('data-mode')!=theme:
            page.locator('[data-theme-toggle]').click()
        expect(page.locator('html')).to_have_attribute('data-mode',theme)
        for width in [320,390,768,1440,1920]:
            page.set_viewport_size({'width':width,'height':1000})
            page.evaluate('window.scrollTo({top:0,behavior:"instant"})')
            page.evaluate('()=>document.fonts.ready')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'overflow {theme} {width}'
            page.screenshot(path=str(OUT/f'{theme}-{width}.png'),full_page=(width==1440))
            checks.append(f'{theme} viewport {width}')
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate('window.scrollTo({top:0,behavior:"instant"})')
    page.locator('[data-menu-toggle]').click()
    expect(page.locator('[data-menu-toggle]')).to_have_attribute('aria-expanded','true')
    expect(page.locator('#site-nav')).to_be_visible()
    page.keyboard.press('Escape')
    expect(page.locator('[data-menu-toggle]')).to_have_attribute('aria-expanded','false')
    page.locator('[data-menu-toggle]').click()
    page.set_viewport_size({'width':1440,'height':1000})
    expect(page.locator('[data-menu-toggle]')).to_have_attribute('aria-expanded','false')
    checks.append('mobile menu, escape, viewport transition')
    page.reload()
    expect(page.locator('html')).to_have_attribute('data-mode','night')
    checks.append('theme persistence')
    page.emulate_media(reduced_motion='reduce')
    page.reload()
    durations = page.locator('.sx-motion-shapes i').first.evaluate('(el)=>getComputedStyle(el).transitionDuration')
    assert all(float(n.strip().removesuffix('s'))<=.001 for n in durations.split(',')),durations
    checks.append('reduced motion')
    nojs = browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844})
    np=nojs.new_page();np.goto(BASE)
    expect(np.locator('h1')).to_be_visible()
    assert np.locator('#typography').inner_text().strip()
    checks.append('no-JS visible content')
    browser.close()
assert not errors, errors
assert not http_errors, http_errors
report={'checks':checks,'count':len(checks),'platform_fonts':fonts,'page_errors':errors,'http_errors':http_errors}
(OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
