/* FeelShareLove — routeur : une seule page, l'écran change selon l'adresse.
   #now  #portrait  #apercu  #personne/<id>  #resonances  #resonances/<id>  #messages  #messages/<id>
   #cercles  #cercle/<id>  #reglages  #donnees  #conditions  #accueil */
(async()=>{
  try{await DB.ensureSeed();}catch(e){if(!e.auth)throw e;
    /* version en ligne, pas encore connecté : écran de connexion (et les conditions) */
    const S0=document.getElementById('screen');const show=()=>{if(location.hash==='#conditions')Pages.conditions(S0);else Pages.connexion(S0);};
    window.addEventListener('hashchange',show);show();return;}
  if(DB.remote){const n=document.getElementById('note');if(n)n.innerHTML='<b>FeelShareLove</b> · version en ligne.';}
  if(window.Photo)await Photo.check();
  App.shell();
  const TAB={now:'now',personne:'now',cercle:'now',cercles:'now',portrait:'portrait',apercu:'portrait',test:'portrait',resonances:'resonances',messages:'messages',tribu:'tribu'};
  const HEAD={now:'now',resonances:'res',messages:'msg',tribu:'tribu',portrait:'port'};
  const FREE=new Set(['accueil','conditions','donnees']);   // accessibles sans pseudo
  /* un seul affichage à la fois : si l'adresse change pendant qu'une page se construit (notification, redirection),
     on finit la page en cours puis on affiche la nouvelle. Sans ça, deux pages s'écrasaient et donnaient « Cannot read properties of null ». */
  let busy=false,again=false;
  async function route(){if(busy){again=true;return;}busy=true;
    try{do{again=false;await routeOnce();}while(again);}finally{busy=false;}}
  async function routeOnce(){
    const h=(location.hash||'#now').slice(1);const [name,param]=h.split('/');
    const me=await DB.get('profiles','me');
    if(!me.pseudo&&!FREE.has(name)){location.hash='#accueil';return;}
    const page=Pages[name]||Pages.now;
    document.body.classList.toggle('onboarding',name==='accueil');
    document.querySelectorAll('.tabs a').forEach(a=>a.classList.toggle('on',a.dataset.tab===TAB[name]));
    App.closeMenu();await App.tickThreads();
    const S=document.getElementById('screen');S.innerHTML='<div class="empty">Chargement…</div>';
    try{await page(S,param&&decodeURIComponent(param));}catch(e){S.innerHTML='<div class="empty">Erreur : '+App.esc(e.message)+'</div>';console.error(e);
      /* l'erreur part au serveur avec le fichier et la ligne, pour le débogage */
      if(DB.remote)try{fetch('/api/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({msg:'Page '+name+' : '+e.message,stack:String(e.stack||''),url:location.hash})}).catch(()=>{});}catch(x){}}
    /* grande icône à côté du titre des cinq écrans du menu */
    if(HEAD[name]&&!param){const t=S.querySelector(':scope > h1')||S.querySelector(':scope > .eyebrow');if(t){const w=document.createElement('div');w.className='titled'+(t.tagName==='H1'?'':' small');t.before(w);w.insertAdjacentHTML('beforeend',Plus.icon(HEAD[name],'ticon'));w.appendChild(t);}}
    S.scrollTop=0;App.refreshMsgCount();if(window.__fitTabs)window.__fitTabs();
    if(DB.remote&&(name==='now'||name==='messages')&&!param)notifAsk(S).catch(()=>{});
    /* quelqu'un attend une réponse : rappel en haut de chaque écran sauf Messages */
    if(name!=='messages'&&name!=='accueil'){const w=await App.pendingIn();if(w.length){const p=await DB.get('profiles',w[0].id);S.insertAdjacentHTML('afterbegin',`<a class="banner" href="#messages/${w[0].id}">${App.esc(App.dn(p))}${w.length>1?' et '+(w.length-1)+' autre'+(w.length>2?'s':''):''} attend${w.length>1?'ent':''} ta réponse</a>`);}}
  }
  /* demande d'activer les notifications, en haut de Maintenant et de Messages ; « Plus tard » la cache une semaine */
  async function notifAsk(S){const KEY='fsl_notif_later';let later=0;try{later=+localStorage.getItem(KEY)||0;}catch(e){}
    if(Date.now()-later<7*864e5||S.querySelector('.notif-ask'))return;
    const st=await DB.pushState();const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)&&!navigator.standalone;
    if(st!=='off'&&!(st==='unsupported'&&ios))return;
    const d=document.createElement('div');d.className='notif-ask';
    d.innerHTML=st==='off'?`<p><b>Être prévenu${App.fem(await DB.get('profiles','me'))?'e':''} quand quelqu'un t'écrit ?</b> Une notification sur ce téléphone, même app fermée. Le contenu des messages n'y apparaît jamais.</p><div class="row" style="justify-content:flex-start;gap:8px;margin-top:8px"><button class="btn flame small-btn" type="button" data-n="on">Activer les notifications</button><button class="linkbtn" type="button" data-n="later">Plus tard</button></div><p class="muted small" data-n="err"></p>`
      :`<p><b>Pour recevoir tes messages sur iPhone</b> : touche le bouton Partager du navigateur, puis « Sur l'écran d'accueil ». Ouvre ensuite FeelShareLove depuis l'icône : l'app te proposera les notifications.</p><button class="linkbtn" type="button" data-n="later" style="margin-top:6px">Compris</button>`;
    d.addEventListener('click',async e=>{const a=e.target.dataset&&e.target.dataset.n;
      if(a==='later'){try{localStorage.setItem(KEY,Date.now());}catch(x){}d.remove();}
      if(a==='on'){e.target.disabled=true;try{await DB.pushOn();d.innerHTML='<p><b>C\'est activé.</b> Tu seras prévenu'+(App.fem(await DB.get('profiles','me'))?'e':'')+' des nouveaux messages.</p>';setTimeout(()=>d.remove(),4000);}
        catch(x){d.querySelector('[data-n=err]').textContent=x.message;e.target.disabled=false;}}});
    const banner=S.querySelector('.banner');if(banner)banner.after(d);else S.prepend(d);}
  window.addEventListener('hashchange',route);
  window.Router={route};
  /* version en ligne : le compteur de demandes se met à jour toutes les 20 secondes */
  /* la mise à jour automatique s'arrête quand l'app n'est pas à l'écran, et reprend tout de suite au retour */
  if(DB.remote){setInterval(()=>{if(document.hidden)return;App.refreshMsgCount().catch(()=>{});},20000);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)return;if(location.hash.startsWith('#messages'))route().catch(()=>{});else App.refreshMsgCount().catch(()=>{});});}
  route();
})();
