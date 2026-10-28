"""Verify finishing details on the real page, including the requested masthead offset."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright, expect
from browser_support import base_url, launch_browser
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'verification/final-polish'
OUT.mkdir(parents=True,exist_ok=True)
checks=[]
with sync_playwright() as p:
    browser = launch_browser(p)
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    assert page.goto(base_url()).status==200
    page.evaluate('()=>document.fonts.ready')
    expect(page.locator('.sx-masthead')).to_have_css('margin-top','-35px')
    checks.append('exact masthead margin-top -35px')
    for theme in ['night','light']:
        page.evaluate('(t)=>{localStorage.setItem("siftion-showcase:mode",t)}',theme)
        page.reload();page.evaluate('()=>document.fonts.ready')
        page.locator('[data-tab="buttons"]').click()
        primary=page.locator('[data-demo-button="primary"]')
        page.mouse.move(0,0)
        shadow=primary.evaluate('(e)=>getComputedStyle(e).boxShadow')
        assert 'inset' in shadow,shadow
        primary.hover();page.wait_for_timeout(220)
        rect=primary.bounding_box();page.mouse.down()
        pressed=primary.evaluate('(e)=>getComputedStyle(e).boxShadow')
        assert pressed!=shadow,(shadow,pressed)
        page.mouse.up()
        expect(primary).to_be_enabled()
        checks.append(theme+' layered primary edge and compressed press')
        page.locator('[data-tab="choices"]').click()
        track=page.locator('#panel-choices .sf-switch__track').first
        assert 'inset' in track.evaluate('(e)=>getComputedStyle(e).boxShadow')
        assert 'none'!=track.evaluate('(e)=>getComputedStyle(e,"::after").boxShadow')
        checks.append(theme+' recessed switch track and lifted thumb')
        page.locator('[data-tab="inputs"]').click()
        field=page.locator('#example-name')
        expect(field).to_have_css('border-top-width','1px')
        assert 'inset' in field.evaluate('(e)=>getComputedStyle(e).boxShadow')
        field.fill('A finished detail')
        page.locator('[data-example-form] button[type="submit"]').click()
        assert 'A finished detail' in page.locator('[data-form-feedback]').inner_text()
        checks.append(theme+' inset input and working form')
        page.locator('#components').screenshot(path=str(OUT/f'input-{theme}.png'))
        page.locator('[data-tab="dialog"]').click()
        page.locator('[data-sf-dialog-open]').click()
        dialog=page.locator('.sf-dialog')
        expect(dialog).to_be_visible()
        assert 'inset' in dialog.evaluate('(e)=>getComputedStyle(e).boxShadow')
        page.screenshot(path=str(OUT/f'dialog-{theme}.png'))
        page.keyboard.press('Escape')
        page.locator('[data-tab="buttons"]').click()
        for width in [1440,768,390,320]:
            page.set_viewport_size({'width':width,'height':1000})
            page.evaluate('window.scrollTo({top:0,behavior:"instant"})')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(theme,width)
            expect(page.locator('.sx-masthead')).to_have_css('margin-top','-35px')
            if width in [1440,390]:
                page.screenshot(path=str(OUT/f'hero-{theme}-{width}.png'))
                page.locator('#components').screenshot(path=str(OUT/f'components-{theme}-{width}.png'))
        checks.append(theme+' four widths, masthead and no horizontal overflow')
        page.set_viewport_size({'width':1440,'height':1000})
    page.emulate_media(reduced_motion='reduce')
    page.reload()
    page.locator('[data-tab="buttons"]').click()
    primary=page.locator('[data-demo-button="primary"]')
    primary.hover();page.mouse.down()
    assert primary.evaluate('(e)=>getComputedStyle(e).transform')=='none'
    page.mouse.up()
    checks.append('reduced motion keeps press state without travel')
    browser.close()
assert not errors,errors
(OUT/'report.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
print(json.dumps({'checks':checks,'errors':errors},indent=2))
