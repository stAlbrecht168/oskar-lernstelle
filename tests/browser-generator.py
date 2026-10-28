from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
soup=BeautifulSoup((ROOT/'index.html').read_text(),'html.parser')
scripts=[]
for script in soup.find_all('script'):
    scripts.append((ROOT/script['src']).read_text() if script.get('src') else script.string or '')
    script.decompose()

sources=[{'id':'mat-1','title':'Mathe: Wassermengen','subject':'math','text':'Wassermengen werden in Litern und Millilitern gemessen. Ein Liter entspricht 1000 Millilitern. Zwei Liter entsprechen 2000 Millilitern.'},
 {'id':'bio-1','title':'Biologie: Pflanzen','subject':'biology','text':'Pflanzen brauchen Wasser zum Leben. Die Wurzeln nehmen Wasser aus dem Boden auf. Ohne Wasser können Pflanzen welken.'}]
journey={'title':'Wasser erforschen','guidingQuestion':'Warum müssen wir Wasser messen und schützen?', 'hook':'Wir untersuchen Wasser aus zwei Blickwinkeln.', 'connection':'Mathe hilft, Wassermengen zu berechnen, Biologie erklärt, wie Pflanzen Wasser aufnehmen.', 'reflectionPrompt':'Wie hängen Gießmengen und Pflanzen zusammen?', 'stations':[
 {'sourceId':'mat-1','subject':'math','heading':'Wasser berechnen','context':'Wir berechnen Wasser für Pflanzen.','question':'Wie viele Milliliter sind ein Liter?','options':['10 Milliliter','1000 Milliliter','100 Milliliter'],'correctIndex':1,'explanation':'In der Quelle steht, dass ein Liter tausend Millilitern entspricht.','evidence':'Ein Liter entspricht 1000 Millilitern.'},
 {'sourceId':'bio-1','subject':'biology','heading':'Pflanzen versorgen','context':'Wie kommen die Pflanzen an ihr Wasser?','question':'Welcher Pflanzenteil nimmt Wasser auf?','options':['Die Blätter','Die Blüten','Die Wurzeln'],'correctIndex':2,'explanation':'Wurzeln nehmen das Wasser direkt aus dem Boden auf.','evidence':'Die Wurzeln nehmen Wasser aus dem Boden auf.'}
]}

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (1200,390):
  page=browser.new_page(viewport={'width':width,'height':950})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(str(soup))
  page.evaluate('''() => {let db={}; Object.defineProperty(window, 'localStorage',{configurable:true,value:{getItem:k=>db[k]??null,setItem:(k,v)=>db[k]=String(v),removeItem:k=>delete db[k],clear:()=>db={}}})}''')
  for script in scripts: page.add_script_tag(content=script)
  assert page.locator('#aiJourneySection').count()==1,errors
  page.evaluate('''(sources)=>{store.materials = sources;persist();render();}''',sources)
  page.locator('#openJourneyBuilder').click()
  page.locator('#journeyTopic').fill('Wasser und Pflanzen')
  assert page.locator('#journeySourcePicker input:checked').count()==2
  page.locator('#aiEndpoint').fill('https://test-worker.example')
  page.locator('#aiToken').fill('secret-for-test')
  page.evaluate('''(data)=>{const nativeFetch=window.fetch;window.fetch=async(url,init)=>{if(String(url).endsWith('/journey'))return new Response(JSON.stringify({journey:data,reviewRequired:true,videosAnalyzed:false}),{status:200,headers:{'content-type':'application/json'}});return nativeFetch(url,init)}}''',journey)
  page.locator('#createAiJourney').click()
  page.wait_for_selector('.ai-journey-draft')
  assert page.locator('.ai-journey-review-station').count()==2,errors
  assert page.locator('[data-jvideo]').count()==1,errors
  assert page.locator('[data-jvideo]').is_checked() is False
  page.locator('[data-jvideo]').check()
  page.locator('[data-japprove]').click()
  assert page.locator('[data-jrun]').count()==1,errors
  page.locator('[data-jrun]').click()
  assert 'Wasser erforschen' in page.locator('#aiJourneyHeader').inner_text()
  page.locator('[data-aiaction="next"]').click()
  assert 'Video' in page.locator('#aiJourneyScene').inner_text()
  assert 'e-IlDMOaX8A' in page.locator('#aiJourneyScene a').get_attribute('href')
  page.locator('[data-aiaction="next"]').click()
  assert 'Milliliter' in page.locator('#aiJourneyScene').inner_text()
  page.locator('[data-aichoice="1"]').click();page.locator('[data-aiaction="check"]').click()
  assert 'Ein Liter entspricht 1000 Millilitern' in page.locator('#aiJourneyFeedback').inner_text()
  page.locator('[data-aiaction="next"]').click()
  page.locator('[data-aichoice="2"]').click();page.locator('[data-aiaction="check"]').click();page.locator('[data-aiaction="next"]').click()
  page.locator('#aiJourneyReflection').fill('Mit Mathe berechne ich die Wassermenge. Biologie zeigt mir, was Pflanzen benötigen.')
  page.locator('[data-aiaction="finish"]').click()
  assert page.locator('#xp').inner_text()=='15',errors
  page.locator('[data-jrun]').click()
  assert page.locator('#xp').inner_text()=='15',errors
  page.locator('#closeAiJourney').click()
  page.screenshot(path=str(ROOT/f'journey-ai-preview-{width}.png'),full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),f'Overflow for {width}'
  assert not errors,errors
  print('OK',width,'approved',page.locator('[data-jrun]').count(),'xp',page.locator('#xp').inner_text(),'errors',errors)
  page.close()
 browser.close()