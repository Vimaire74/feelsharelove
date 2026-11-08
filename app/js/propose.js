/* FeelShareLove — « Vos propositions » : mode propositions et corrections.
   Activé depuis le menu (ou en bas du portrait), il ajoute un bouton « Proposer une correction » en haut de chaque page
   et sous chaque titre. La proposition est envoyée au serveur avec la page, la rubrique et la langue ; Marc la lit dans l'admin. */
window.Propose=(function(){
  const K='fsl_propose';
  const on=v=>{try{if(v!==undefined)localStorage.setItem(K,v?'1':'');return localStorage.getItem(K)==='1';}catch(e){return false;}};
  const PAGES={now:'Présent',resonances:'Résonances',messages:'Messages',tribu:'Ma tribu',portrait:'Mon portrait',apercu:'Ce que les autres voient',cercles:'Cercles',reglages:'Réglages',donnees:'Mes données',conditions:'Aide et conditions',personne:'Portrait d\'une personne',test:'Test du fonctionnement'};
  const page=()=>{const h=(location.hash||'#now').slice(1);const k=h.split('/')[0];return {hash:'#'+h,name:PAGES[k]||k};};
  const label=()=>on()?'Désactiver le mode propositions et corrections':'Activer le mode propositions et corrections';
  function switchHtml(){return `<div class="prop-box"><b>Vos propositions</b><span>Une traduction, un mot, une œuvre qui manque, une idée : dis-le-nous à l'endroit précis.</span><button type="button" class="prop-switch" data-on="${on()}">${label()}</button></div>`;}
  function scan(){const S=document.querySelector('.screen');if(!S)return;
    document.querySelectorAll('.prop-switch').forEach(b=>{const v=String(on());if(b.dataset.on!==v){b.dataset.on=v;b.textContent=label();}});
    const F=document.getElementById('prop-foot');if(F&&!F.firstChild)F.innerHTML=switchHtml();
    if(!on()){S.querySelectorAll('.prop-btn').forEach(b=>b.remove());return;}
    if(!S.querySelector('.prop-page')){const b=document.createElement('button');b.type='button';b.className='prop-btn prop-page';b.textContent='Proposer une correction sur cette page';S.prepend(b);}
    S.querySelectorAll('h1,h2').forEach(h=>{if(h.closest('.prop-sheet')||h.closest('.prop-btn'))return;const n=h.nextElementSibling;if(n&&n.classList.contains('prop-btn'))return;
      const b=document.createElement('button');b.type='button';b.className='prop-btn';b.textContent='Proposer une correction';h.after(b);});}
  let t=null;const later=()=>{clearTimeout(t);t=setTimeout(scan,150);};
  /* capture de ce que la personne voit, prise avant l'ouverture de la fenêtre (bibliothèque chargée seulement à ce moment) */
  let lib=null;const loadLib=()=>lib||(lib=new Promise((ok,ko)=>{if(window.html2canvas)return ok();const sc=document.createElement('script');sc.src='js/vendor/html2canvas.min.js';sc.onload=ok;sc.onerror=ko;document.head.appendChild(sc);}));
  async function capture(){await loadLib();const c=await html2canvas(document.body,{x:scrollX,y:scrollY,width:innerWidth,height:innerHeight,scale:Math.min(2,devicePixelRatio||1),backgroundColor:'#0d0607',logging:false,
      ignoreElements:el=>el.classList&&(el.classList.contains('prop-sheet')||el.classList.contains('menu'))});
    const W=Math.min(1000,c.width),k=W/c.width,o=document.createElement('canvas');o.width=W;o.height=Math.round(c.height*k);o.getContext('2d').drawImage(c,0,0,o.width,o.height);
    return new Promise(ok=>o.toBlob(ok,'image/jpeg',.72));}
  async function upload(blob){const r=await fetch('/api/files',{method:'POST',headers:{'Content-Type':'image/jpeg',Authorization:'Bearer '+DB.token},body:blob});if(!r.ok)throw new Error('upload');return (await r.json()).id;}
  function sheet(sec){const P=page();const shot=DB.remote?capture().catch(()=>null):Promise.resolve(null);const d=document.createElement('div');d.className='prop-sheet';
    d.innerHTML=`<div class="prop-card"><p class="eyebrow">Ta proposition</p><p class="muted small">Concerne : <b>${App.esc(P.name)}</b>${sec?' › <b>'+App.esc(sec)+'</b>':''}</p>
      <textarea class="ta" rows="5" maxlength="3000" placeholder="Ce qu'il faudrait corriger, ajouter ou changer, et comment…"></textarea>
      <label class="check prop-cap"><input type="checkbox" data-c checked> Joindre une capture de l'écran</label>
      <div class="row"><button class="btn ghost" type="button" data-x>Annuler</button><button class="btn" type="button" data-s><span class="spin" hidden></span><span data-l>Envoyer</span></button></div><p class="muted small" data-m></p></div>`;
    document.body.appendChild(d);const ta=d.querySelector('textarea'),m=d.querySelector('[data-m]');ta.focus();
    d.addEventListener('click',e=>{if(e.target===d||e.target.closest('[data-x]'))d.remove();});
    const S=d.querySelector('[data-s]'),busy=v=>{S.disabled=v;S.querySelector('.spin').hidden=!v;S.classList.toggle('busy',v);};
    S.addEventListener('click',async()=>{const text=ta.value.trim();if(!text){ta.focus();return;}
      if(!DB.remote){m.textContent='Les propositions s\'envoient seulement depuis le site en ligne.';return;}
      busy(true);m.textContent='';
      try{let img=null;if(d.querySelector('[data-c]').checked){const b=await shot;if(b)try{img=await upload(b);}catch(e){}}
        await DB.put('proposals',{by:'me',page:P.name,hash:P.hash,section:sec||'',lang:(window.I18N&&I18N.lang)||'fr',text,img,ts:Date.now(),width:innerWidth});
        S.querySelector('.spin').hidden=true;m.textContent='Merci, ta proposition est envoyée.';setTimeout(()=>d.remove(),1400);}
      catch(e){busy(false);m.textContent='Envoi impossible pour le moment. Réessaie plus tard.';}});}
  document.addEventListener('click',e=>{
    const s=e.target.closest('.prop-switch');if(s){on(!on());if(window.App&&App.closeMenu)App.closeMenu();scan();return;}
    const b=e.target.closest('.prop-btn');if(!b)return;
    const h=b.classList.contains('prop-page')?null:b.previousElementSibling;
    let t='';if(h){const c=h.cloneNode(true);c.querySelectorAll('.prop-btn').forEach(x=>x.remove());t=c.textContent.replace(/\s+/g,' ').trim();}sheet(t);});
  function start(){const S=document.querySelector('.screen');if(!S)return setTimeout(start,300);
    new MutationObserver(later).observe(S,{childList:true,subtree:true});window.addEventListener('hashchange',later);scan();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  return {on,scan,switchHtml};
})();
