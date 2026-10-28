from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
D=Path(__file__).resolve().parents[1]
soup=BeautifulSoup((D/'index.html').read_text(),'html.parser')
scripts=[]
for s in soup.find_all('script'):
 if s.get('src'):scripts.append((D/s['src']).read_text())
 else:scripts.append(s.string or '')
 s.decompose()

def load(page):
 page.set_content(str(soup))
 page.evaluate('''() => {let db={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return db[k]??null},setItem(k,v){db[k]=String(v)},removeItem(k){delete db[k]},clear(){db={}}}})}''')
 for s in scripts:page.add_script_tag(content=s)

with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [1200,390]:
  page=b.new_page(viewport={'width':width,'height':850});errs=[]
  page.on('pageerror',lambda e:errs.append(str(e)))
  load(page)
  print('viewport',width,'title',page.title(),'bio btn',page.locator('[data-subject="biology"]').count(),'journey steps',page.locator('[data-journey]').count(),'errors',errs)
  assert not errs
  assert page.locator('[data-subject="biology"]').count()==1
  assert page.locator('[data-journey]').count()==6
  page.locator('[data-journey="start"]').click();page.locator('[data-jaction="complete"]').click()
  assert page.locator('#journeySceneTitle').inner_text().startswith('Ein Video')
  assert 'e-IlDMOaX8A' in page.locator('.journey-link').get_attribute('href')
  page.locator('[data-jaction="complete"]').click()
  page.locator('[data-journey="math"]').click()
  assert '750 ml' in page.locator('#journeySceneBody').inner_text()
  page.locator('[data-janswer="1"]').click();page.locator('[data-jaction="check"]').click()
  assert 'Richtig' in page.locator('#journeyAnswerFeedback').inner_text()
  page.locator('[data-jaction="continue"]').click()
  page.locator('[data-journey="biology"]').click()
  page.locator('[data-janswer="0"]').click();page.locator('[data-jaction="check"]').click();page.locator('[data-jaction="continue"]').click()
  assert page.locator('[data-journey="final"]').is_enabled()
  page.locator('[data-journey="final"]').click();page.locator('#journeyReflection').fill('Mit Mathe berechne ich Mengen und Biologie erklärt, warum Pflanzen Wasser brauchen.')
  page.locator('[data-jaction="finish"]').click()
  assert page.locator('#journeyProgressText').inner_text().startswith('5 von 6')
  assert page.locator('#xp').inner_text()=='15'
  page.screenshot(path=str(D/f'journey-preview-{width}.png'),full_page=True)
  page.evaluate('''() => { const data=JSON.parse(localStorage.getItem('oskar-lernpfad-demo-v1'));data.materials=[
  {id:'m1',title:'Mathe, Wasser berechnen',subject:'math',text:'Wasser: Zwei Liter Wasser sind 2000 Milliliter. Mit der Wassermenge können wir rechnen.',created:'2026-10-28'},
  {id:'b1',title:'Bio, Pflanzenwurzeln',subject:'biology',text:'Pflanzen brauchen Wasser. Die Wurzeln nehmen Wasser aus dem Boden auf.',created:'2026-10-28'}];
  localStorage.setItem('oskar-lernpfad-demo-v1',JSON.stringify(data)); store=readStore(); render();}''')
  assert page.locator('.bridge-card').count()>=1
  assert 'Mathe, Wasser berechnen' in page.locator('#bridgeList').inner_text()
  assert 'Bio, Pflanzenwurzeln' in page.locator('#bridgeList').inner_text()
  assert page.locator('[data-mix="water"]').is_disabled()
  print('bridge and errors',page.locator('.bridge-card').count(),errs)
  assert not errs
  if width==390:
   assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2')
  page.close()
 b.close()