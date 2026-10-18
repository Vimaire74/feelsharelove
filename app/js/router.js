/* Connect — routeur : une seule page, l'écran change selon l'adresse.
   #now  #portrait  #apercu  #personne/<id>  #resonances  #resonances/<id>  #messages  #messages/<id>
   #cercles  #cercle/<id>  #reglages  #donnees  #conditions  #accueil */
(async()=>{
  try{await DB.ensureSeed();}catch(e){if(!e.auth)throw e;
    /* version en ligne, pas encore connecté : écran de connexion (et les conditions) */
    const S0=document.getElementById('screen');const show=()=>{if(location.hash==='#conditions')Pages.conditions(S0);else Pages.connexion(S0);};
    window.addEventListener('hashchange',show);show();return;}
  if(DB.remote){const n=document.getElementById('note');if(n)n.innerHTML='<b>FeelShareLove</b> · version en ligne.';}
  App.shell();
  const TAB={now:'now',personne:'now',cercle:'now',cercles:'now',portrait:'portrait',apercu:'portrait',test:'portrait',resonances:'resonances'};
  const FREE=new Set(['accueil','conditions','donnees']);   // accessibles sans pseudo
  async function route(){
    const h=(location.hash||'#now').slice(1);const [name,param]=h.split('/');
    const me=await DB.get('profiles','me');
    if(!me.pseudo&&!FREE.has(name)){location.hash='#accueil';return;}
    const page=Pages[name]||Pages.now;
    document.body.classList.toggle('onboarding',name==='accueil');
    document.querySelectorAll('.tabs a').forEach(a=>a.classList.toggle('on',a.dataset.tab===TAB[name]));
    App.closeMenu();await App.tickThreads();
    const S=document.getElementById('screen');S.innerHTML='<div class="empty">Chargement…</div>';
    try{await page(S,param&&decodeURIComponent(param));}catch(e){S.innerHTML='<div class="empty">Erreur : '+App.esc(e.message)+'</div>';console.error(e);}
    S.scrollTop=0;App.refreshMsgCount();
    /* quelqu'un attend une réponse : rappel en haut de chaque écran sauf Messages */
    if(name!=='messages'&&name!=='accueil'){const w=await App.pendingIn();if(w.length){const p=await DB.get('profiles',w[0].id);S.insertAdjacentHTML('afterbegin',`<a class="banner" href="#messages/${w[0].id}">${App.esc(App.dn(p))}${w.length>1?' et '+(w.length-1)+' autre'+(w.length>2?'s':''):''} attend${w.length>1?'ent':''} ta réponse</a>`);}}
  }
  window.addEventListener('hashchange',route);
  window.Router={route};
  /* version en ligne : le compteur de demandes se met à jour toutes les 20 secondes */
  if(DB.remote)setInterval(()=>{App.refreshMsgCount().catch(()=>{});},20000);
  route();
})();
