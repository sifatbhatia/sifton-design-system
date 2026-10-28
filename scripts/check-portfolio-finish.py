"""Additional composition evidence for the in-place portfolio finish."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright, expect
from browser_support import base_url, launch_browser
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'verification'/'portfolio-finish';OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
with sync_playwright() as p:
    browser = launch_browser(p)
    context=browser.new_context(viewport={'width':1440,'height':1000},color_scheme='light')
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    assert page.goto(base_url()).status==200
    page.evaluate('()=>document.fonts.ready')
    expect(page.locator('html')).to_have_attribute('data-mode','night')
    assert not page.locator('.sx-component-source').evaluate('(e)=>e.open')
    checks.append('dark default regardless of system scheme; source collapsed')
    rail=page.locator('.sx-reading-tile');before=rail.bounding_box()['width']
    rail.hover();page.wait_for_timeout(700);after=rail.bounding_box()['width']
    assert after>before+20,(before,after)
    page.mouse.move(0,0);page.wait_for_timeout(700)
    checks.append({'coordinated_rail_width':{'rest':before,'hover':after}})
    button=page.locator('[data-demo-button="primary"]')
    assert button.bounding_box()['height']<=53
    assert button.locator('.sf-button__cap').bounding_box()['width']==18
    checks.append('compact 51px primary with 18px inline arrow')
    page.locator('[data-tab="buttons"]').focus();page.keyboard.press('ArrowDown')
    expect(page.locator('[data-tab="inputs"]')).to_be_focused()
    page.keyboard.press('ArrowUp');expect(page.locator('[data-tab="buttons"]')).to_be_focused()
    checks.append('vertical keyboard tab traversal')
    page.locator('[data-tab="buttons"]').evaluate('(e)=>e.blur()')
    for theme in ['night','light']:
        page.evaluate('(v)=>document.documentElement.dataset.mode=v',theme)
        for width in [1440,390,320]:
            page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844})
            page.evaluate('window.scrollTo({top:0,behavior:"instant"})');page.wait_for_timeout(750)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.screenshot(path=str(OUT/f'hero-{theme}-{width}.png'))
            page.screenshot(path=str(OUT/f'page-{theme}-{width}.png'),full_page=True)
            page.evaluate('window.scrollTo({top:document.querySelector("#components").offsetTop-90,behavior:"instant"})')
            page.screenshot(path=str(OUT/f'components-{theme}-{width}.png'))
            page.locator('.sx-component-preview').screenshot(path=str(OUT/f'controls-{theme}-{width}.png'))
            for key in ['choices','disclosure','dialog']:
                page.locator(f'[data-tab="{key}"]').click()
                page.locator('.sx-component-preview').screenshot(path=str(OUT/f'{key}-{theme}-{width}.png'))
            page.locator('[data-tab="buttons"]').click()
            checks.append(f'{theme} {width}: hero and component visual evidence; no overflow')
    page.emulate_media(reduced_motion='reduce')
    assert page.locator('.sx-rail-item').first.evaluate('(e)=>getComputedStyle(e).transitionDuration')=='0s'
    page.locator('[data-rearrange]').click();expect(page.locator('[data-rearrange]')).to_have_attribute('aria-pressed','true')
    assert page.locator('.sx-layout-preview').evaluate('(e)=>e.getAnimations({subtree:true}).length')==0
    checks.append('rail and layout change: immediate reduced-motion state')
    for asset in ['assets/favicon.svg','assets/social-card.png','assets/social-card.svg']:
        response=context.request.get(base_url()+asset)
        assert response.status==200 and len(response.body())>100
    checks.append('brand metadata assets served')
    assert not errors,errors
    browser.close()
report={'checks':checks,'count':len(checks),'page_errors':errors}
(OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
