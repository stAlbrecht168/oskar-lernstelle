/* Bild- und Video-Präsentation für Entdeckerreisen. Nur kuratierte URLs; Videos erfordern bewussten Klick. */
'use strict';
const JOURNEY_MEDIA_IMAGES = Object.freeze({"water":{"file":"Water droplets on leaf.jpg","alt":"Wassertropfen auf einem grünen Blatt","icon":"💧","credit":"CC0 · Siddharth Patil","source":"https://commons.wikimedia.org/wiki/File:Water_droplets_on_leaf.jpg","theme":"blue","src":"https://commons.wikimedia.org/wiki/Special:FilePath/Water%20droplets%20on%20leaf.jpg?width=960"},"plant":{"file":"Water droplets on leaf.jpg","alt":"Grünes Blatt mit Wassertropfen","icon":"🌱","credit":"CC0 · Siddharth Patil","source":"https://commons.wikimedia.org/wiki/File:Water_droplets_on_leaf.jpg","theme":"green","src":"https://commons.wikimedia.org/wiki/Special:FilePath/Water%20droplets%20on%20leaf.jpg?width=960"},"earth":{"file":"Blue Marble.jpg","alt":"Die Erde aus dem Weltraum","icon":"🌍","credit":"NASA · Gemeinfrei","source":"https://commons.wikimedia.org/wiki/File:Blue_Marble.jpg","theme":"blue","src":"https://commons.wikimedia.org/wiki/Special:FilePath/Blue%20Marble.jpg?width=960"},"data":{"file":"Bar chart.jpg","alt":"Ein Säulendiagramm","icon":"📊","credit":"CC0 · Brigban","source":"https://commons.wikimedia.org/wiki/File:Bar_chart.jpg","theme":"purple","src":"https://commons.wikimedia.org/wiki/Special:FilePath/Bar%20chart.jpg?width=960"},"light":{"file":"Sunlight photography image.jpg","alt":"Sonnenlicht in der Natur","icon":"☀️","credit":"CC0 · Gopinath Karumalai","source":"https://commons.wikimedia.org/wiki/File:Sunlight_photography_image.jpg","theme":"gold","src":"https://commons.wikimedia.org/wiki/Special:FilePath/Sunlight%20photography%20image.jpg?width=960"},"book":{"file":"Open book (Unsplash).jpg","alt":"Ein aufgeschlagenes Buch","icon":"📖","credit":"CC0 · Ben White","source":"https://commons.wikimedia.org/wiki/File:Open_book_(Unsplash).jpg","theme":"purple","src":"https://commons.wikimedia.org/wiki/Special:FilePath/Open%20book%20(Unsplash).jpg?width=960"},"cycle":{"file":"The Water Cycle (SVS30580).png","alt":"Grafik der NASA zum Wasserkreislauf","icon":"🌦️","credit":"NASA · Gemeinfrei","source":"https://commons.wikimedia.org/wiki/File:The_Water_Cycle_(SVS30580).png","theme":"blue","src":"https://commons.wikimedia.org/wiki/Special:FilePath/The%20Water%20Cycle%20(SVS30580).png?width=960"}});
const JOURNEY_MEDIA_VIDEOS = Object.freeze({"simpli-water":{"id":"e-IlDMOaX8A","title":"Das üble Geschäft mit Wasser","channel":"Simplicissimus","cover":"water","note":"Vor dem Anschauen gemeinsam auf altersgerechte Stellen prüfen."},"nasa-cycle":{"id":"oaDkph9yQBs","title":"Der Wasserkreislauf aus dem All","channel":"NASA Goddard · Englisch","cover":"cycle","note":"Englische Animation über Wasser auf der Erde, optional."}});
function journeyMediaImage(key,caption='',variant='scene'){
 const m=JOURNEY_MEDIA_IMAGES[key]||JOURNEY_MEDIA_IMAGES.book;
 const credit='<a href="'+m.source+'" target="_blank" rel="noopener noreferrer" aria-label="Bildquelle öffnen">Bildquelle</a>';
 return '<figure class="jmedia jmedia--'+variant+' jmedia--'+m.theme+'">'+
   '<img class="jmedia-img" loading="lazy" decoding="async" src="'+m.src+'" alt="'+m.alt+'">'+
   '<figcaption><span>'+m.icon+' '+(typeof noHtml==='function'?noHtml(caption):caption)+'</span><small>'+m.credit+' · '+credit+'</small></figcaption></figure>';
}
function journeyMediaKey(text,subjectId){
 if(subjectId==='geography')return 'earth';
 if(subjectId==='biology')return 'plant';
 if(subjectId==='math')return 'data';
 const t=String(text||'').toLocaleLowerCase('de-DE');
 if(/wasser|regen|fluss|meer|ozean|trinkwasser|niederschlag|pflanz/.test(t))return 'water';
 if(/licht|schatten|sonne|optik|farbe/.test(t))return 'light';
 if(/diagramm|statistik|daten|tabelle|messwert/.test(t))return 'data';
 if(/klima|erde|kontinent|geograf|erdkunde|welt/.test(t))return 'earth';
 return 'book';
}
function journeyMediaThumb(key,modifier=''){
 const m=JOURNEY_MEDIA_IMAGES[key]||JOURNEY_MEDIA_IMAGES.book;
 return '<span class="jmedia-thumb '+modifier+' jmedia--'+m.theme+'"><img class="jmedia-img" loading="lazy" decoding="async" src="'+m.src+'" alt=""></span>';
}
function journeyMediaVideo(key){
 const v=JOURNEY_MEDIA_VIDEOS[key];
 if(!v)return '';
 const m=JOURNEY_MEDIA_IMAGES[v.cover];
 return '<div class="jmedia-video" data-jmedia-video="'+key+'"><img class="jmedia-img" loading="lazy" decoding="async" src="'+m.src+'" alt="">'+
 '<div class="jmedia-video-shade"><span class="jmedia-video-label">'+v.channel+'</span><button type="button" class="jmedia-play" data-jmedia-play="'+key+'" aria-label="Video '+v.title+' abspielen">▶ <span>Video abspielen</span></button><strong>'+v.title+'</strong></div></div>'+
 '<p class="jmedia-video-note">YouTube wird erst nach Klick auf „Video abspielen“ eingebunden. '+v.note+' <a href="https://www.youtube.com/watch?v='+v.id+'" target="_blank" rel="noopener noreferrer">Alternativ bei YouTube öffnen</a></p>';
}
function journeyMediaBoot(){
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-jmedia-play]');if(!button)return;
  const v=JOURNEY_MEDIA_VIDEOS[button.dataset.jmediaPlay];if(!v)return;
  const host=button.closest('.jmedia-video');if(!host)return;
  const frame=document.createElement('iframe');
  frame.title='Video: '+v.title;
  frame.src='https://www.youtube-nocookie.com/embed/'+v.id+'?rel=0';
  frame.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.allowFullscreen=true;
  host.replaceChildren(frame);
  host.classList.add('is-playing');
 },true);
 document.addEventListener('error',e=>{
  if(e.target instanceof HTMLImageElement&&e.target.classList.contains('jmedia-img'))e.target.hidden=true;
 },true);
 const style=document.createElement('style');style.textContent=JOURNEY_MEDIA_STYLES;document.head.appendChild(style);
}
const JOURNEY_MEDIA_STYLES = "\n.jmedia{position:relative;overflow:hidden;border-radius:20px;margin:0 0 18px;min-height:195px;background:linear-gradient(135deg,#12324e,#2787a1);isolation:isolate}\n.jmedia--green{background:linear-gradient(130deg,#123b31,#379974)}.jmedia--gold{background:linear-gradient(130deg,#43396c,#e6a64b)}.jmedia--purple{background:linear-gradient(130deg,#34345e,#8d84c6)}\n.jmedia-img{display:block;width:100%;height:100%;object-fit:cover;position:absolute;inset:0}.jmedia-img[hidden]{display:none}\n.jmedia:after{content:\"\";position:absolute;inset:25% 0 0;z-index:0;background:linear-gradient(0deg,rgba(9,24,46,.8),transparent);pointer-events:none}\n.jmedia figcaption{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;position:absolute;bottom:12px;left:15px;right:15px;color:#fff;z-index:1;line-height:1.4}\n.jmedia figcaption>span{font-size:15px;font-weight:850;text-shadow:0 2px 8px #001a36}\n.jmedia figcaption small{font-size:10px;text-align:right;color:#dceef5;max-width:46%}\n.jmedia figcaption a{color:#fff;text-decoration:underline}\n.jmedia--scene{height:190px}.jmedia--compact{height:125px;min-height:125px;margin-bottom:11px}\n.jmedia-intro{position:relative;overflow:hidden;min-height:230px!important;isolation:isolate;background:#103d57!important;color:#fff!important}\n.jmedia-intro:before{content:\"\";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(11,37,67,.95) 0%,rgba(13,51,80,.9) 45%,rgba(13,51,80,.13) 100%)}\n.jmedia-intro .jmedia-img{z-index:-2;object-position:center}\n.jmedia-intro-copy{max-width:65%;position:relative;z-index:1}.jmedia-intro h3,.jmedia-intro .journey-flag,.jmedia-intro .journey-subjects{color:white}.jmedia-intro p{color:#e5f4fd!important}\n.jmedia-intro .jmedia-intro-credit{position:absolute;bottom:11px;right:15px;font-size:10px;color:#dceef5;z-index:1}.jmedia-intro-credit a{color:#fff}\n.jmedia-thumb{display:block;position:relative;overflow:hidden;width:59px;height:55px;flex:0 0 59px;border-radius:12px;background:#dceaf3}\n.jmedia-thumb .jmedia-img{object-fit:cover}\n.journey-node button .jmedia-thumb{width:64px;height:59px;flex-basis:64px}\n.jmedia-video{position:relative;height:220px;overflow:hidden;border-radius:18px;background:#102b42;margin-top:15px;isolation:isolate}\n.jmedia-video:after{content:\"\";position:absolute;inset:0;background:linear-gradient(0deg,#0c1d33e8,#0c1d332a);pointer-events:none}\n.jmedia-video-shade{z-index:1;position:absolute;inset:15px;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;gap:7px;color:white}\n.jmedia-video-shade strong{font-size:16px;line-height:1.3}.jmedia-video-label{font-size:11px;background:#fff3;border-radius:100px;padding:4px 9px}\n.jmedia-play{border:0;border-radius:12px;background:#fff;color:#173852;padding:12px 18px;font:inherit;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 5px 24px #0006}\n.jmedia-play:hover,.jmedia-play:focus-visible{background:#dcf7fc;outline:2px solid #fff}\n.jmedia-video-note{font-size:11px!important;line-height:1.5!important;margin:5px 0 14px;color:#66778d!important}\n.jmedia-video.is-playing:after{display:none}.jmedia-video iframe{display:block;border:0;width:100%;height:100%;position:absolute;inset:0}\n.jmedia-video-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start}\n.jmedia-video-grid .jmedia-video{height:176px}.jmedia-video-grid .jmedia-video-shade strong{font-size:13px}.jmedia-video-grid .jmedia-play{padding:9px 11px}\n.jmedia-tile{display:grid;grid-template-columns:134px minmax(0,1fr) auto;align-items:center;gap:16px;width:100%}\n.jmedia-tile .jmedia-thumb{width:134px;height:100px;border-radius:13px}\n.jmedia-tile-body{min-width:0}.jmedia-tile .journey-tile-actions{justify-content:flex-end;max-width:205px;margin:0}\n.jmedia-tile .jmedia-tile-body p{overflow-wrap:anywhere}\n.jmedia-scene-caption{font-size:11px;color:#667b94;margin:2px 0 15px}\n.jmedia-scene-caption strong{color:#3b6793}\n@media(max-width:670px){.jmedia-video-grid{grid-template-columns:1fr}.jmedia-video-grid .jmedia-video{height:200px}.jmedia-intro-copy{max-width:100%}.jmedia-intro:before{background:linear-gradient(90deg,rgba(11,37,67,.94),rgba(11,37,67,.58))}\n.jmedia-tile{grid-template-columns:86px minmax(0,1fr)}.jmedia-tile .jmedia-thumb{width:86px;height:95px}.jmedia-tile .journey-tile-actions{grid-column:1/-1;max-width:none;justify-content:flex-start}.jmedia figcaption{flex-wrap:wrap}.jmedia figcaption small{max-width:100%}}\n@media(max-width:430px){.jmedia-intro{min-height:255px!important}.journey-node button .jmedia-thumb{width:45px;height:52px;flex-basis:45px}.jmedia--scene{height:147px;min-height:147px}.jmedia-intro-copy h3{font-size:21px}}\n@media(prefers-reduced-motion:reduce){.jmedia *{scroll-behavior:auto!important;transition:none!important}}\n";
journeyMediaBoot();

// Decorative story intros. Story text and learning actions never wait for WebGL.
const journeyStoryIntro=(()=>{
 const MODULE='https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
 let library=null,active=null;
 const symbols={water:'💧',plant:'🌱',earth:'🌍',light:'☀️',data:'📊',book:'📖'};
 function markup(theme='book'){
  const key=Object.hasOwn(symbols,theme)?theme:'book';
  return '<figure class="story-intro" data-story-theme="'+key+'"><div class="story-intro-art" aria-hidden="true"><span class="story-intro-symbol">'+symbols[key]+'</span><span class="story-intro-orbit"></span></div><div class="story-intro-controls" hidden><button type="button" data-story-pause>Animation pausieren</button><button type="button" data-story-skip>Animation überspringen</button></div><figcaption>Dein Abenteuer beginnt <small>Illustration zum Einstieg</small></figcaption></figure>';
 }
 function stop(){if(active){const old=active;active=null;old.dispose();}}
 function mount(host){
  stop();if(!host)return;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'),controls=host.querySelector('.story-intro-controls');
  if(reduce.matches){host.dataset.state='static';return;}
  let cancelled=false,renderer=null,scene=null,observer=null,elapsed=0,last=null,paused=false,finished=false;
  const pause=host.querySelector('[data-story-pause]'),skip=host.querySelector('[data-story-skip]');
  const dispose=()=>{
   if(cancelled)return;cancelled=true;observer?.disconnect();
   document.removeEventListener('visibilitychange',visibility);reduce.removeEventListener('change',motion);
   pause.removeEventListener('click',toggle);skip.removeEventListener('click',finish);
   if(renderer){renderer.setAnimationLoop(null);scene?.traverse(o=>{o.geometry?.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m?.dispose());});renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
   controls.hidden=true;host.dataset.state='static';
  };
  const motion=()=>{if(reduce.matches)stop();};
  const visibility=()=>{last=null;if(renderer&&!finished)renderer.setAnimationLoop(document.hidden||paused?null:frame);};
  const toggle=()=>{if(finished)return;paused=!paused;pause.textContent=paused?'Animation fortsetzen':'Animation pausieren';host.dataset.state=paused?'paused':'playing';visibility();};
  const finish=()=>{if(cancelled||!renderer)return;finished=true;renderer.setAnimationLoop(null);pose(1);renderer.render(scene,camera);controls.hidden=true;host.dataset.state='finished';};
  let camera,world,hero,orbit;
  const pose=t=>{
   const reveal=1-Math.pow(1-Math.min(1,t*2),3);world.scale.setScalar(.3+.7*reveal);
   world.rotation.y=Math.sin(t*Math.PI*1.6)*.24;hero.position.y=Math.sin(t*Math.PI*3)*.12;
   orbit.rotation.y=t*Math.PI*1.5;orbit.rotation.z=.3+Math.sin(t*4)*.12;
   camera.position.z=7.5-reveal*.8;
  };
  const frame=time=>{
   if(cancelled)return;
   if(!host.isConnected){stop();return;}
   if(last!==null)elapsed+=Math.max(0,time-last);last=time;
   if(elapsed>=7000){finish();return;}
   try{pose(elapsed/7000);renderer.render(scene,camera);}catch{stop();}
  };
  active={dispose};host.dataset.state='loading';
  // Check capability before requesting a third-party library. No school text is sent.
  const probe=document.createElement('canvas');let gl;
  try{gl=probe.getContext('webgl2');}catch{}
  if(!gl){stop();return;}
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  library??=import(MODULE).catch(error=>{library=null;throw error;});
  library.then(T=>{
   if(cancelled)return;
   if(!host.isConnected||reduce.matches){stop();return;}
   try{
    renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
    renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.addEventListener('webglcontextlost',()=>{if(!cancelled)stop();},{once:true});
    host.querySelector('.story-intro-art').append(renderer.domElement);
    scene=new T.Scene();camera=new T.PerspectiveCamera(36,1,.1,40);camera.position.set(0,.35,7);
    scene.add(new T.HemisphereLight(0xffffff,0x666b95,3));const sun=new T.DirectionalLight(0xffffff,3);sun.position.set(3,5,4);scene.add(sun);
    world=new T.Group();scene.add(world);hero=new T.Group();world.add(hero);orbit=new T.Group();world.add(orbit);
    const material=color=>new T.MeshStandardMaterial({color,roughness:.35,metalness:.08});
    const mesh=(geo,color,parent=hero)=>{const object=new T.Mesh(geo,material(color));parent.add(object);return object;};
    const sphere=(r,color,parent=hero)=>mesh(new T.SphereGeometry(r,28,20),color,parent);
    const theme=host.dataset.storyTheme;
    if(theme==='water'){
     const drop=sphere(.72,0x58cbea);drop.scale.set(.78,1.2,.78);
     const tip=mesh(new T.ConeGeometry(.51,.9,28),0x58cbea);tip.position.y=.83;
     for(let i=0;i<3;i++){const ripple=mesh(new T.TorusGeometry(.8+i*.31,.025,8,60),0xa7e8ed);ripple.rotation.x=Math.PI/2;ripple.position.y=-1.03-i*.035;}
    }else if(theme==='earth'){
     sphere(1,0x69a9eb);for(let i=0;i<7;i++){const land=sphere(.23,0x71d8ad);const a=i*2.4;land.position.set(Math.sin(a)*.78,Math.cos(i*1.8)*.5,Math.cos(a)*.78);land.scale.set(1.5,1,.5);}
    }else if(theme==='plant'){
     const stem=mesh(new T.CylinderGeometry(.055,.075,1.6,12),0x3e9a71);stem.position.y=-.2;
     for(let i=0;i<4;i++){const leaf=sphere(.38,i%2?0x71d7a2:0x45b88d);leaf.scale.set(1.3,.4,.55);leaf.position.set(i%2?.4:-.4,-.55+i*.38,0);leaf.rotation.z=i%2?.5:-.5;}
     const soil=sphere(.6,0xb6a3d0);soil.scale.y=.25;soil.position.y=-1.05;
    }else if(theme==='light'){
     sphere(.72,0xffd16d);for(let i=0;i<12;i++){const ray=mesh(new T.CapsuleGeometry(.04,.3,3,6),0xffdf91);const a=i*Math.PI/6;ray.position.set(Math.sin(a)*1.15,Math.cos(a)*1.15,0);ray.rotation.z=-a;}
    }else if(theme==='data'){
     for(let i=0;i<4;i++){const h=.6+i*.38;const bar=mesh(new T.BoxGeometry(.36,h,.45),[0x8b8ae8,0x5fbfd9,0x67c5a2,0xffce7d][i]);bar.position.set((i-1.5)*.55,h/2-.9,0);}
    }else{
     for(const side of [-1,1]){const book=mesh(new T.BoxGeometry(.85,.12,1.3),0x9a91e9);book.position.x=side*.44;book.rotation.z=side*.17;const page=mesh(new T.BoxGeometry(.8,.08,1.22),0xfff9ed);page.position.set(side*.44,.1,0);page.rotation.z=side*.17;}
     hero.rotation.x=.5;
    }
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9;const spark=sphere(.035+(i%3)*.015,i%2?0xffd790:0xb8a6ee,orbit);spark.position.set(Math.cos(a)*1.65,Math.sin(a)*1.15,Math.sin(i)*.5);}
    const resize=()=>{if(cancelled)return;const {width,height}=host.querySelector('.story-intro-art').getBoundingClientRect();renderer.setSize(Math.max(1,width),Math.max(1,height),false);camera.aspect=Math.max(1,width)/Math.max(1,height);camera.updateProjectionMatrix();if(finished){pose(1);renderer.render(scene,camera);}};
    observer=new ResizeObserver(resize);observer.observe(host);resize();
    pause.addEventListener('click',toggle);skip.addEventListener('click',finish);document.addEventListener('visibilitychange',visibility);reduce.addEventListener('change',motion);
    controls.hidden=false;host.dataset.state='playing';pose(0);visibility();
   }catch{stop();}
  }).catch(()=>{if(!cancelled)stop();});
 }
 const style=document.createElement('style');style.textContent=`
 .story-intro{position:relative;isolation:isolate;overflow:hidden;margin:0 0 20px;border-radius:20px;height:230px;background:radial-gradient(ellipse at 35% 20%,#e1f8f5,transparent 60%),linear-gradient(135deg,#e9edff,#f1eaff);color:#35456d}
 .story-intro-art{position:absolute;inset:0 0 30px;display:grid;place-items:center}.story-intro-art canvas{position:absolute;inset:0;width:100%;height:100%}.story-intro-symbol{font-size:80px;filter:drop-shadow(0 12px 14px #9a9dcc44)}.story-intro-orbit{position:absolute;width:155px;height:155px;border:1px solid #afa5df55;border-radius:50%;transform:rotateX(55deg)}
 .story-intro[data-state=playing] .story-intro-symbol,.story-intro[data-state=paused] .story-intro-symbol,.story-intro[data-state=finished] .story-intro-symbol,.story-intro[data-state=playing] .story-intro-orbit,.story-intro[data-state=paused] .story-intro-orbit,.story-intro[data-state=finished] .story-intro-orbit{visibility:hidden}
 .story-intro figcaption{position:absolute;bottom:14px;left:18px;right:18px;font-size:13px;font-weight:800;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.story-intro figcaption small{font-size:11px;font-weight:500;color:#67718e}.story-intro-controls{position:absolute;z-index:1;top:10px;right:10px;display:flex;gap:6px}.story-intro-controls[hidden]{display:none}.story-intro-controls button{font-size:11px;color:#455172;border:1px solid #ffffffc0;background:#ffffffd9;border-radius:10px;padding:7px 9px}
 @media(max-width:520px){.story-intro{height:205px}.story-intro-controls button{font-size:10px;padding:7px}.story-intro figcaption{font-size:12px}}
 `;document.head.appendChild(style);
 return {markup,mount,stop};
})();
