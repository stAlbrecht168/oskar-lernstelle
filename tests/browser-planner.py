"""Browser smoke checks for the date-based learning plan and activity tracking.

Requires: pip install playwright beautifulsoup4; Playwright Chromium.
Run from repository root: python tests/browser-planner.py
"""
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
soup = BeautifulSoup((ROOT / 'index.html').read_text(), 'html.parser')
scripts = []
for script in soup.find_all('script'):
    scripts.append((ROOT / script['src']).read_text() if script.get('src') else (script.string or ''))
    script.decompose()


def prepare(page):
    page.set_content(str(soup))
    page.evaluate("""() => {
      let db = {};
      Object.defineProperty(window, 'localStorage', {configurable:true, value:{
        getItem(k){return db[k] ?? null;},
        setItem(k,v){db[k]=String(v);},
        removeItem(k){delete db[k];},
        clear(){db={};}
      }});
    }""")
    for src in scripts:
        page.add_script_tag(content=src)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        headless=True, executable_path='/usr/bin/chromium',
        args=['--no-sandbox', '--disable-dev-shm-usage']
    )
    for width in (1200, 390):
        page = browser.new_page(viewport={'width':width,'height':850})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        prepare(page)
        assert not errors, errors
        assert 'Tagesmission' in page.locator('#planTeaser').inner_text()
        page.locator('#planOpen').click()
        assert page.locator('#plannerOverlay').evaluate('(el) => el.classList.contains("show")')
        assert page.locator('.plan-row').count() == 14
        page.locator('[data-plan-tab="tracking"]').click()
        assert 'Letzte 14 Tage' in page.locator('#planContent').inner_text()
        page.locator('[data-plan-tab="dates"]').click()
        assert page.locator('input[data-exam-id="biology"]').count() == 1

        # Set a test exam for tomorrow, without depending on today's real date.
        page.evaluate("""() => {
          const now = new Date(); now.setDate(now.getDate() + 1);
          const tomorrow = [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
          store.examDates = Object.fromEntries(EXAMS.map(e => [e.id, e.id === 'music' ? tomorrow : null]));
          persist(); render();
        }""")
        page.locator('#plannerClose').click()
        assert 'Musik' in page.locator('#planTeaserText').inner_text()
        page.locator('#planStart').click()
        assert page.locator('#lessonOverlay').evaluate('(el) => el.classList.contains("show")')
        for _ in range(3):
            answer = page.evaluate('session.items[session.index].correct')
            page.locator(f'[data-answer="{answer}"]').click()
            page.locator('#nextBtn').click()
            page.locator('#nextBtn').click()
        assert page.evaluate('store.studyLog.length') == 1
        assert page.evaluate('store.studyLog[0].subject') == 'music'
        assert page.evaluate('store.days.includes(todayKey())')
        assert 'Heute gelernt' in page.locator('#planTeaserStatus').inner_text()

        page.locator('#nextBtn').click()  # close finished quiz
        page.locator('#planOpen').click()
        page.locator('[data-plan-tab="tracking"]').click()
        assert '1/14' in page.locator('#planContent').inner_text()
        assert not errors, errors
        if width == 390:
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2')
        print(f'planner smoke OK: {width}px')
        page.close()
    browser.close()
