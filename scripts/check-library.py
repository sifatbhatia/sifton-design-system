"""Live interaction and standalone reuse checks.
Run: uv run --with playwright python scripts/check-library.py
Requires a running project server; configure SIFTION_BASE_URL (see browser_support.py).
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright, expect
from browser_support import base_url, launch_browser
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'verification'/'library'; OUT.mkdir(parents=True,exist_ok=True)
BASE = base_url()
checks=[]; errors=[]; http_errors=[]; snippets=[]
def passed(name): checks.append(name)
with sync_playwright() as p:
    browser = launch_browser(p)
    context=browser.new_context(viewport={'width':1440,'height':1000},color_scheme='light')
    page=context.new_page(); page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:http_errors.append(r.url) if r.status>=400 and not r.url.endswith('favicon.ico') else None)
    page.goto(BASE);page.evaluate('()=>document.fonts.ready')
    page.evaluate('SiftionUI.init(document);SiftionUI.init(document)')
    page.locator('[data-tab="buttons"]').click()
    for key in ['primary','signal','ghost','icon','async']:
        button=page.locator(f'[data-demo-button="{key}"]');button.click()
        code=page.locator('[data-component-code]').text_content()
        assert 'styles/library.css' in code and 'SiftionUI.init' in code
        assert 'data-demo-button' not in code and 'sx-' not in code
        snippets.append({'key':key,'code':code})
        if key=='async':
            expect(button).to_be_disabled();expect(button).to_have_attribute('aria-busy','true')
            expect(button).to_be_enabled(timeout=3000);expect(button).to_have_attribute('data-state','saved')
            assert 'nothing was sent' in page.locator('[data-sf-async-status]').inner_text()
        passed(key+' action and source')
    expect(page.locator('#panel-buttons button:disabled')).to_have_text('unavailable')
    page.locator('[data-tab="buttons"]').focus();page.keyboard.press('End')
    expect(page.locator('[data-tab="undo"]')).to_be_focused()
    page.keyboard.press('Home');expect(page.locator('[data-tab="buttons"]')).to_be_focused()
    passed('tab Home / End and repeated init')
    primary=page.locator('[data-demo-button="primary"]')
    primary.hover();page.wait_for_timeout(400)
    hover=primary.locator('.sf-button__cap').evaluate('(e)=>getComputedStyle(e).transform')
    primary.focus();page.mouse.move(0,0);page.wait_for_timeout(400)
    focused=primary.locator('.sf-button__cap').evaluate('(e)=>getComputedStyle(e).transform')
    assert hover==focused and focused!='none'
    primary.evaluate('(e)=>e.blur()')
    passed('primary hover and keyboard focus share the same inline arrow response')
    for key in ['inputs','states','choices','disclosure','dialog','undo']:
        page.locator(f'[data-tab="{key}"]').click()
        snippets.append({'key':key,'code':page.locator('[data-component-code]').text_content()})
    page.locator('[data-tab="states"]').click()
    page.locator('input[name="feedback-state"][value="attention"]').check()
    assert 'needs attention' in page.locator('[data-component-code]').text_content()
    assert page.evaluate('''() => {const t=document.createElement('template');t.innerHTML=document.querySelector('[data-component-code]').textContent;return t.content.querySelector('input[value="attention"]').hasAttribute('checked')}''')
    passed('feedback snippet reflects selected message and checked state')
    page.locator('[data-tab="inputs"]').click()
    page.locator('#example-name').fill('MixedCase Draft');page.locator('[data-example-form] button[type="submit"]').click()
    assert 'MixedCase Draft' in page.locator('[data-form-feedback]').inner_text()
    passed('saved user casing preserved')
    page.locator('[data-tab="choices"]').click()
    switch=page.locator('.sf-switch input').first;switch.focus();page.keyboard.press('Space');expect(switch).to_be_checked()
    expect(page.locator('.sf-switch input').nth(1)).to_be_disabled()
    chip=page.locator('.sf-choices input[value="notes"]');chip.check();expect(chip).to_be_checked();chip.uncheck()
    page.locator('input[name="density"]').first.focus();page.keyboard.press('ArrowRight')
    expect(page.locator('input[name="density"][value="compact"]')).to_be_checked()
    passed('native switch, disabled switch, checkbox chips, radio arrows')
    page.locator('[data-tab="disclosure"]').click();summary=page.locator('.sf-disclosure summary').nth(1)
    summary.focus();page.keyboard.press('Enter');expect(page.locator('.sf-disclosure').nth(1)).to_have_attribute('open','')
    page.keyboard.press('Space');assert not page.locator('.sf-disclosure').nth(1).evaluate('(e)=>e.open')
    passed('native disclosure keyboard open and close')
    page.locator('[data-tab="dialog"]').click();opener=page.locator('[data-sf-dialog-open]');opener.click()
    expect(page.locator('.sf-dialog')).to_be_visible()
    for _ in range(8):
        page.keyboard.press('Tab');assert page.evaluate('document.activeElement.closest(".sf-dialog") !== null')
    page.keyboard.press('Escape');expect(opener).to_be_focused();expect(page.locator('.sf-dialog')).not_to_be_visible()
    opener.click();page.locator('.sf-dialog button[value="keep"]').click();expect(opener).to_be_focused()
    passed('modal focus containment, Escape, close, focus return')
    page.locator('[data-tab="undo"]').click();page.locator('[data-sf-remove]').click()
    expect(page.locator('[data-sf-undo-item]')).not_to_be_visible();expect(page.locator('[data-sf-restore]')).to_be_focused()
    page.locator('[data-sf-restore]').click();expect(page.locator('[data-sf-remove]')).to_be_focused()
    page.locator('[data-sf-remove]').click();page.locator('[data-sf-dismiss]').click();expect(page.locator('[data-sf-undo-reset]')).to_be_focused()
    page.locator('[data-sf-undo-reset]').click();expect(page.locator('[data-sf-undo-item]')).to_be_visible()
    passed('remove, persistent undo, dismiss, reset, focus return')
    page.locator('[data-sf-split-toggle]').click();page.locator('[data-sf-split-reset]').click()
    expect(page.locator('[data-sf-split-toggle]')).to_have_attribute('aria-pressed','false')
    snippets.append({'key':'split','code':page.locator('[data-split-source] code').text_content()})
    passed('split reversal and reset')
    for key in ['reveal','stagger','expand','direction']:
        recipe=page.locator(f'[data-sf-motion="{key}"]')
        recipe.locator('[data-sf-play]').click()
        if key=='expand':
            expect(recipe.locator('[data-sf-play]')).to_have_attribute('aria-expanded','true')
            expect(recipe.locator('[data-sf-expand-body]')).to_be_visible()
        recipe.evaluate('(e)=>{for(let i=0;i<5;i++)e.querySelector("[data-sf-play]").click();e.querySelector("[data-sf-reset]").click()}')
        page.wait_for_timeout(600)
        assert recipe.evaluate('(e)=>e.getAnimations({subtree:true}).length')==0
        expect(recipe.locator('[data-sf-motion-status]')).to_have_text('reset')
        if key=='expand':expect(recipe.locator('[data-sf-expand-body]')).not_to_be_visible()
        snippets.append({'key':key,'code':page.locator(f'[data-recipe="{key}"] code').text_content()})
        passed(key+' replay, rapid interrupt, reset')
    # Successful and rejected clipboard paths, inspecting the exact payload.
    page.evaluate('window.copied=[];Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async text=>window.copied.push(text)}})')
    source=page.locator('[data-recipe="reveal"] details');source.locator('summary').click();source.locator('[data-copy-recipe]').click()
    assert page.evaluate('window.copied[0]')==source.locator('code').text_content()
    page.evaluate('Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:()=>Promise.reject(Error("denied"))}})')
    source.locator('[data-copy-recipe]').click();expect(page.locator('[data-copy-dialog]')).to_be_visible()
    assert page.locator('#manual-copy').input_value()==source.locator('code').text_content()
    page.keyboard.press('Escape');expect(source.locator('[data-copy-recipe]')).to_be_focused();source.locator('summary').click()
    passed('motion clipboard payload and fallback focus return')
    page.wait_for_timeout(3500)
    for theme in ['light','night']:
        page.evaluate('(theme)=>document.documentElement.dataset.mode=theme',theme)
        for width in [320,390,1440]:
            page.set_viewport_size({'width':width,'height':1000})
            for key in ['buttons','inputs','states','choices','disclosure','dialog','undo']:
                page.locator(f'[data-tab="{key}"]').click()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(theme,width,key)
            page.locator('[data-tab="buttons"]').click()
            page.locator('#components').scroll_into_view_if_needed()
            page.screenshot(path=str(OUT/f'actions-{theme}-{width}.png'))
            page.locator('[data-tab="choices"]').click()
            page.screenshot(path=str(OUT/f'choices-{theme}-{width}.png'))
            page.locator('#motion').scroll_into_view_if_needed()
            page.screenshot(path=str(OUT/f'motion-{theme}-{width}.png'))
            passed(f'{theme} {width}: all seven panels fit')
    page.emulate_media(reduced_motion='reduce')
    for key in ['reveal','stagger','expand','direction']:
        recipe=page.locator(f'[data-sf-motion="{key}"]');recipe.locator('[data-sf-play]').click()
        assert recipe.evaluate('(e)=>e.getAnimations({subtree:true}).length')==0
        recipe.locator('[data-sf-reset]').click()
    passed('reduced motion: all four scripted recipes immediate')
    # Every copied example is rendered without showcase.css or showcase.js.
    assert len(snippets)==16 and len({s['key'] for s in snippets})==16
    (OUT/'snippets.json').write_text(json.dumps(snippets,indent=2),encoding='utf-8')
    gallery='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Siftion UI reuse verification</title>'
    gallery+=''.join(f'<link rel="stylesheet" href="../../styles/{f}.css">' for f in ['tokens','components','library'])
    gallery+='<body style="padding:24px"><h1>Siftion UI standalone patterns</h1>'
    for snippet in snippets:gallery+=f'<section data-reuse="{snippet["key"]}" style="max-width:700px;margin:60px auto"><h2>{snippet["key"]}</h2>{snippet["code"]}</section>'
    gallery+='<script src="../../scripts/library.js"></script><script>SiftionUI.init(document);SiftionUI.init(document);</script></body></html>'
    (OUT/'reuse.html').write_text(gallery,encoding='utf-8')
    reuse=context.new_page();reuse.on('pageerror',lambda e:errors.append(str(e)));reuse.goto(BASE+'verification/library/reuse.html')
    reuse.locator('[data-sf-async]').click();expect(reuse.locator('[data-sf-async]')).to_have_attribute('data-state','saved',timeout=3000)
    reuse.locator('[data-sf-input]').fill('Standalone MixedCase');reuse.locator('[data-sf-form] button[type="submit"]').click()
    assert 'Standalone MixedCase' in reuse.locator('[data-sf-form-status]').inner_text()
    scoped=reuse.evaluate('''() => {
      const original=document.querySelector('[data-sf-form]');
      const first=original.cloneNode(true), sibling=original.cloneNode(true);
      SiftionUI.init(first); SiftionUI.init(first);
      const a=new Event('submit',{cancelable:true}), b=new Event('submit',{cancelable:true});
      first.dispatchEvent(a); sibling.dispatchEvent(b);
      return a.defaultPrevented && !b.defaultPrevented;
    }''')
    assert scoped
    passed('scoped initializer includes root itself and leaves siblings unbound')
    reuse.locator('[data-sf-feedback] input[value="attention"]').check();expect(reuse.locator('[data-sf-feedback-status]')).to_have_text('needs attention')
    reuse.locator('[data-sf-dialog-open]').click();expect(reuse.locator('.sf-dialog')).to_be_visible();reuse.keyboard.press('Escape')
    reuse.locator('[data-sf-remove]').click();reuse.locator('[data-sf-restore]').click();expect(reuse.locator('[data-sf-undo-item]')).to_be_visible()
    reuse.locator('[data-sf-split-toggle]').click();expect(reuse.locator('[data-sf-split-toggle]')).to_have_attribute('aria-pressed','true')
    for key in ['reveal','stagger','expand','direction']:
        reuse.locator(f'[data-sf-motion="{key}"] [data-sf-play]').click();reuse.locator(f'[data-sf-motion="{key}"] [data-sf-reset]').click()
    reuse.set_viewport_size({'width':320,'height':900});assert reuse.evaluate('document.documentElement.scrollWidth<=innerWidth')
    reuse.screenshot(path=str(OUT/'reuse-mobile.png'),full_page=True)
    passed('all 16 copied snippets rendered standalone; behaviors exercised without showcase assets')
    nojs=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844});np=nojs.new_page();np.goto(BASE)
    for key in ['buttons','inputs','states','choices','disclosure','dialog','undo']:expect(np.locator(f'#panel-{key}')).to_be_visible()
    np.locator('.sf-choices input[value="notes"]').check();expect(np.locator('.sf-choices input[value="notes"]')).to_be_checked()
    passed('no-JS: all seven panels visible, native choices work')
    assert not errors,errors;assert not http_errors,http_errors
    browser.close()
report={'count':len(checks),'checks':checks,'snippet_count':len(snippets),'page_errors':errors,'http_errors':http_errors}
(OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
