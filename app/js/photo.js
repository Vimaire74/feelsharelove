/* FeelShareLove — photo de portrait : recadrage à la main (glisser, zoomer), dessin au choix,
   et mode voyage (se localiser ailleurs pour un temps). Tout se calcule sur le téléphone. */
window.Photo=(function(){
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const load=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});
  /* découpe carrée 600×600 autour du centre (cx, cy en fraction de l'image) avec le zoom z */
  async function crop(src,c){const im=await load(src);const w=im.naturalWidth,h=im.naturalHeight,m=Math.min(w,h),S=m/c.z;
    let sx=c.cx*w-S/2,sy=c.cy*h-S/2;sx=Math.max(0,Math.min(w-S,sx));sy=Math.max(0,Math.min(h-S,sy));
    const cv=document.createElement('canvas');cv.width=cv.height=600;cv.getContext('2d').drawImage(im,sx,sy,S,S,0,0,600,600);return cv.toDataURL('image/jpeg',.85);}
  /* centrage automatique sur le visage quand le navigateur sait le faire, sinon un peu au-dessus du milieu */
  async function guess(im){const w=im.naturalWidth,h=im.naturalHeight;
    try{if('FaceDetector' in window){const f=await new FaceDetector({maxDetectedFaces:1}).detect(im);if(f&&f[0]){const b=f[0].boundingBox;
      return {cx:(b.x+b.width/2)/w,cy:(b.y+b.height/2)/h,z:Math.max(1,Math.min(3,Math.min(w,h)/(b.width*2.2)))};}}}catch(e){}
    return {cx:.5,cy:h>w?.42:.5,z:1};}

  /* éditeur : src = photo d'origine ; renvoie {crop, style, real, photo} ou null */
  function edit(src,init={}){return new Promise(async resolve=>{
    const phone=document.querySelector('.phone');const o=document.createElement('div');o.className='cam pe';
    o.innerHTML=`<div class="cam-top"><b>Ta photo</b><p>Glisse pour la placer, zoome avec la barre ou deux doigts. Le rond montre ce que les autres verront.</p></div>
      <div class="pe-frame"><img alt="" draggable="false"></div>
      <label class="pe-zoom"><span>Zoom</span><input type="range" min="1" max="3" step="0.01" value="1"></label>
      <div class="cam-styles">${App.STYLES.map(x=>`<button class="chip" type="button" data-s="${x[0]}">${x[1]}</button>`).join('')}</div>
      <p class="cam-hint">Avec un dessin, seul le dessin est montré aux autres. Ta vraie photo reste privée (elle sert seulement à la vérification).</p>
      <div class="cam-bar"><button class="btn ghost" type="button" data-a="cancel">Annuler</button><button class="btn flame" type="button" data-a="ok">Valider</button></div>`;
    phone.appendChild(o);
    const fr=o.querySelector('.pe-frame'),img=fr.querySelector('img'),zr=o.querySelector('input[type=range]');
    const im=await load(src);const w=im.naturalWidth,h=im.naturalHeight,m=Math.min(w,h);
    let c=init.crop||await guess(im),style=init.style||'real';const cache={real:src};
    const F=()=>fr.clientWidth;
    function place(){const f=F(),sc=f/m*c.z,W=w*sc,H=h*sc;let ox=f/2-c.cx*W,oy=f/2-c.cy*H;
      ox=Math.min(0,Math.max(f-W,ox));oy=Math.min(0,Math.max(f-H,oy));c.cx=(f/2-ox)/W;c.cy=(f/2-oy)/H;
      img.style.width=W+'px';img.style.height=H+'px';img.style.left=ox+'px';img.style.top=oy+'px';zr.value=c.z;}
    async function setStyle(s){style=s;o.querySelectorAll('.cam-styles .chip').forEach(b=>b.classList.toggle('on',b.dataset.s===s));
      if(!cache[s])cache[s]=await App.stylize(src,s);if(style===s)img.src=cache[s];}
    img.src=src;place();setStyle(style);
    zr.addEventListener('input',()=>{c.z=+zr.value;place();});
    /* glisser à un doigt, zoomer à deux */
    const pts=new Map();let last=null;
    fr.addEventListener('pointerdown',e=>{fr.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});last=null;});
    fr.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const prev=pts.get(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
      const f=F(),sc=f/m*c.z;
      if(pts.size===1){c.cx-=(e.clientX-prev.x)/(w*sc);c.cy-=(e.clientY-prev.y)/(h*sc);place();}
      else if(pts.size===2){const [a,b]=[...pts.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(last)c.z=Math.max(1,Math.min(3,c.z*d/last));last=d;place();}});
    const up=e=>{pts.delete(e.pointerId);last=null;};fr.addEventListener('pointerup',up);fr.addEventListener('pointercancel',up);
    o.querySelector('.cam-styles').addEventListener('click',e=>{const s=e.target.dataset&&e.target.dataset.s;if(s)setStyle(s);});
    o.addEventListener('click',async e=>{const a=e.target.dataset&&e.target.dataset.a;if(!a)return;
      if(a==='cancel'){o.remove();resolve(null);return;}
      if(a==='ok'){e.target.disabled=true;e.target.textContent='Un instant…';
        const real=await crop(src,c);const photo=style==='real'?real:await App.stylize(real,style);o.remove();resolve({crop:{...c},style,real,photo});}});
  });}

  /* ---------- mode voyage ---------- */
  async function locate(){
    const pos=await new Promise((res,rej)=>{if(!navigator.geolocation)return rej(new Error('Ce navigateur ne sait pas localiser.'));
      navigator.geolocation.getCurrentPosition(res,()=>rej(new Error('Localisation refusée ou impossible. Tu peux écrire la ville à la main.')),{enableHighAccuracy:false,timeout:15000,maximumAge:600000});});
    const {latitude:la,longitude:lo}=pos.coords;
    const r=await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${la}&longitude=${lo}&localityLanguage=fr`);if(!r.ok)throw new Error('Ville introuvable. Tu peux l\'écrire à la main.');
    const d=await r.json();const city=d.city||d.locality||d.principalSubdivision||'';if(!city)throw new Error('Ville introuvable. Tu peux l\'écrire à la main.');
    return city+(d.countryCode?' '+d.countryCode:'');}
  function start(me,city,days){if(!me.travel)me.travel={homeCity:me.city||''};me.travel.city=city;me.travel.until=days?Date.now()+days*864e5:null;me.travel.since=me.travel.since||Date.now();me.city=city;}
  function end(me){if(!me.travel)return;me.city=me.travel.homeCity||me.city;delete me.travel;}
  /* au démarrage : fin du voyage si la date est passée */
  async function check(){try{const me=await DB.get('profiles','me');if(me&&me.travel&&me.travel.until&&Date.now()>me.travel.until){end(me);await DB.put('profiles',me);}}catch(e){}}
  /* bloc « en voyage » dans Mon portrait */
  function travelBox(el,me,save,refresh){
    const fmt=t=>new Date(t).toLocaleDateString('fr-CH',{day:'numeric',month:'long'});
    if(me.travel){el.innerHTML=`<p class="small"><b style="color:var(--saffron)">En voyage à ${esc(me.travel.city)}</b>${me.travel.until?' jusqu\'au '+fmt(me.travel.until):''}. Les autres te voient là-bas ; chez toi : ${esc(me.travel.homeCity||'—')}.</p><button class="btn ghost small-btn" type="button" id="tv-end" style="margin-top:8px">Je suis rentré${App.fem(me)?'e':''}</button>`;
      el.querySelector('#tv-end').addEventListener('click',()=>{end(me);save();refresh();});return;}
    el.innerHTML=`<button class="linkbtn" type="button" id="tv-open">Je suis en voyage : me localiser ici pour le moment</button><div id="tv-form" hidden></div>`;
    el.querySelector('#tv-open').addEventListener('click',()=>{const f=el.querySelector('#tv-form');f.hidden=false;el.querySelector('#tv-open').hidden=true;let days=7;
      f.innerHTML=`<p class="muted small" style="margin:8px 0 6px">Pendant</p><div class="intent" style="margin-top:0">${[[3,'3 jours'],[7,'1 semaine'],[14,'2 semaines'],[30,'1 mois'],[0,'Jusqu\'à mon retour']].map(([d,l])=>`<button class="chip${d===7?' on':''}" type="button" data-d="${d}">${l}</button>`).join('')}</div>
        <div class="row" style="justify-content:flex-start;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn flame small-btn" type="button" id="tv-loc">Me localiser</button><input class="in" id="tv-city" placeholder="ou écris la ville" style="flex:1;min-width:140px"><button class="btn small-btn" type="button" id="tv-ok">Valider</button></div><p class="muted small" id="tv-msg" style="margin-top:6px"></p>`;
      f.querySelectorAll('[data-d]').forEach(b=>b.addEventListener('click',()=>{days=+b.dataset.d;f.querySelectorAll('[data-d]').forEach(x=>x.classList.toggle('on',x===b));}));
      f.querySelector('#tv-loc').addEventListener('click',async()=>{const msg=f.querySelector('#tv-msg');msg.textContent='Localisation…';
        try{const c=await locate();f.querySelector('#tv-city').value=c;msg.textContent='Trouvé : '+c+'. Touche Valider.';}catch(e){msg.textContent=e.message;}});
      f.querySelector('#tv-ok').addEventListener('click',()=>{const c=f.querySelector('#tv-city').value.trim();if(!c){f.querySelector('#tv-msg').textContent='Localise-toi ou écris la ville.';return;}start(me,c,days);save();refresh();});});}
  return {edit,crop,locate,start,end,check,travelBox};
})();
