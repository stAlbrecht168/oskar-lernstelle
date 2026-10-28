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
 '<p class="jmedia-video-note">YouTube wird erst nach Klick auf „Video abspielen“ eingebunden. '+v.note+'</p>';
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
