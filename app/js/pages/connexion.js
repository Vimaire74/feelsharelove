/* FeelShareLove — écran « Connexion » (version en ligne seulement) : créer un compte ou se reconnecter */
Pages.connexion=function(S){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  document.body.classList.add('onboarding');
  /* page d'accueil : la profession de foi, puis « Commencer » qui ouvre la création du compte */
  /* page d'accueil en 3 écrans, style peinture rupestre : paroi de pierre, pigments ocre, rouge et blanc, icônes du site en grand */
  const ICO=window.Plus?Plus.ICONS:{};
  const ic=k=>ICO[k]||'';
  const big=(k,w)=>(ICO[k]||'').replace('<svg ','<svg width="'+w+'" height="'+w+'" ');
  const DEFS=`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <filter id="rk-rough"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3"/></filter>
    <symbol id="rk-man" viewBox="0 0 20 40"><circle cx="10" cy="5" r="4" fill="currentColor"/><path d="M10 9v14M10 23l-6 15M10 23l6 15M10 13l-8 7M10 13l8-6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></symbol></defs></svg>`;
  const ART=[
  `<svg class="rk-art" viewBox="0 0 320 190" aria-hidden="true">
    <g class="rk-paint"><circle cx="160" cy="95" r="70" fill="none" stroke="var(--rk-red)" stroke-width="2" stroke-dasharray="1 9" stroke-linecap="round"/><circle cx="160" cy="95" r="88" fill="none" stroke="var(--rk-red)" stroke-width="2" stroke-dasharray="1 12" stroke-linecap="round" opacity=".6"/></g>
    <g class="rk-paint" style="color:var(--rk-ochre)"><use href="#rk-man" x="140" y="58" width="40" height="80"/></g>
    <g class="rk-paint" style="color:var(--rk-kaolin)" opacity=".55"><use href="#rk-man" x="18" y="120" width="16" height="32"/><use href="#rk-man" x="62" y="30" width="14" height="28"/><use href="#rk-man" x="270" y="125" width="16" height="32"/><use href="#rk-man" x="250" y="22" width="13" height="26"/><use href="#rk-man" x="290" y="70" width="12" height="24"/></g>
    <g fill="var(--rk-kaolin)" opacity=".35"><circle cx="40" cy="70" r="2"/><circle cx="100" cy="150" r="2"/><circle cx="220" cy="160" r="2"/><circle cx="230" cy="70" r="2"/><circle cx="110" cy="40" r="2"/></g></svg>`,
  `<svg class="rk-art" viewBox="0 0 320 190" aria-hidden="true">
    <g class="rk-paint" fill="none" stroke="var(--rk-ochre)" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 8"><path d="M120 95c10-22 10-44 0-60"/><path d="M200 95c-10-22-10-44 0-60"/><path d="M110 120c22-34 22-80 0-104" opacity=".7"/><path d="M210 120c-22-34-22-80 0-104" opacity=".7"/></g>
    <g class="rk-paint" style="color:var(--rk-red)"><use href="#rk-man" x="62" y="50" width="44" height="88"/></g>
    <g class="rk-paint" style="color:var(--rk-ochre)"><use href="#rk-man" x="214" y="50" width="44" height="88"/></g>
    <g class="rk-paint" style="color:var(--saffron)" transform="translate(136 50) scale(1.5)">${big('res',32)}</g>
    <path d="M20 170c60-10 220-10 280 0" fill="none" stroke="var(--rk-kaolin)" stroke-width="2" stroke-dasharray="14 6 3 6" opacity=".5"/></svg>`,
  `<svg class="rk-art" viewBox="0 0 320 170" aria-hidden="true">
    <g class="rk-paint" fill="none" stroke="var(--rk-red)" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 9"><ellipse cx="160" cy="85" rx="130" ry="70"/></g>
    <g class="rk-paint" style="color:var(--saffron)" transform="translate(115 30) scale(2.8)">${big('tribu',32)}</g>
    <g class="rk-paint" style="color:var(--rk-kaolin)" opacity=".7"><use href="#rk-man" x="30" y="70" width="18" height="36"/><use href="#rk-man" x="272" y="70" width="18" height="36"/><use href="#rk-man" x="70" y="118" width="16" height="32"/><use href="#rk-man" x="236" y="118" width="16" height="32"/></g></svg>`];
  const step=(k,html)=>`<div class="rk-step"><span class="rk-ic">${ic(k)}</span><p>${html}</p></div>`;
  const PAGES=[
  ['FeelShareLove',`<h1>Recréer <em>du lien</em></h1>
  <p>Aujourd'hui, <b>de très nombreuses personnes sont seules</b>. Le sentiment de rejet et d'abandon est partagé par des gens de tout âge, sur tous les continents.</p>
  <p>Notre société numérique nous isole toujours davantage : <i>chacun chez soi</i>, devant sa télévision, son téléphone ou son ordinateur, à consommer des vidéos.</p>
  <p>Les « réseaux sociaux » ne sont plus des réseaux sociaux. Ce sont <b>des vitrines commerciales</b>, où un algorithme décide à notre place de ce que nous regardons, pour nous garder captifs le plus longtemps possible.</p>`],
  ['Notre réponse',`<h1>Ce qui nous <em>fait vibrer</em></h1>
  <p>Il nous paraît vital de casser ce cercle qui mène tant de personnes à la solitude. Notre réponse est simple : <b>recréer du lien</b>.</p>
  <p>Rapprocher les gens <i>par ce qu'ils aiment</i>, <i>par leur manière de fonctionner</i>, <i>par ce qui les fait vibrer</i>.</p>
  <p>Puisque le numérique est partout, autant qu'il serve à nous relier. FeelShareLove te permet de <b>rencontrer des inconnus qui te ressemblent</b>, d'échanger par messages écrits ou vocaux, puis, nous l'espérons, de vous retrouver <b>dans la vraie vie</b>.</p>
  <p class="rk-no">Ici, <b>pas de publicité</b>, <b>pas de vidéos</b> à faire défiler, et <b>personne ne choisit à ta place</b> qui tu rencontres.</p>`],
  ['Comment ça marche',`<h1>De la résonance <em>à la tribu</em></h1><div class="rk-steps">
  ${step('port',"<b>1. Ton portrait.</b> Comment tu fonctionnes, tes goûts, tes passions : <i>qui tu es, avec précision</i>. Tout ne sera pas visible : l'essentiel sert à calculer ta <b>résonance</b> avec d'autres, près de chez toi ou ailleurs dans le monde.")}
  ${step('res',"<b>2. Tes résonances.</b> Tu vois avec qui tu résonnes et tu découvres une partie de son profil : tu peux alors <i>comprendre pourquoi vous êtes similaires</i> et choisir si tu veux la contacter.")}
  ${step('msg',"<b>3. Le premier message.</b> Si un goût commun t'emballe (le même film, la même chanson, le même jeu vidéo, le même musée ou la même région du monde), écris-lui. Dès que cette personne te répond, vous pourrez voir une plus grande partie de vos profils mutuels.")}
  ${step('tribu',"<b>4. La tribu.</b> Quand vous vous connaissez mieux, vous pouvez inviter l'autre dans votre tribu, et l'autre <b>doit</b> répondre. <i>Fini les rejets silencieux</i> : un choix de réponses appropriées et polies lui est proposé s'il refuse. S'il accepte, vous êtes de la même tribu : la plupart de ce que vous avez choisi de partager devient visible l'un pour l'autre. Vous devenez <i>intimes de passions, de sentiments, de fonctionnement</i>, et il y a de bonnes chances que vous deveniez de vrais amis, ou plus si vous le souhaitez. ❤️")}</div>`]];
  let pg=0;
  function intro(){const last=pg===PAGES.length-1;
    S.innerHTML=`<div class="rock">${DEFS}<div class="rk-top"><span class="rk-brand">${PAGES[pg][0]} <span class="beta-tag">BÊTA</span></span><button class="linkbtn" type="button" id="c-have">J'ai déjà un compte</button></div>
    ${ART[pg]}<div class="rk-txt">${PAGES[pg][1]}</div>
    ${last?`<p class="rk-beta">L'application est en phase de test. Tes retours comptent : <a href="mailto:contact@feelsharelove.com">contact@feelsharelove.com</a></p>`:''}
    <div class="rk-dots">${PAGES.map((x,i)=>`<i class="${i===pg?'on':''}"></i>`).join('')}</div>
    <div class="row" style="justify-content:space-between;margin:14px 0 4px">${pg?'<button class="linkbtn" type="button" id="c-prev">← Retour</button>':'<span></span>'}
      <button class="btn flame" type="button" id="c-next">${last?'Commencer':'Suivant →'}</button></div></div>`;
    S.scrollTop=0;
    $('c-next').addEventListener('click',()=>{if(last)form(true);else{pg++;intro();}});
    const pv=$('c-prev');if(pv)pv.addEventListener('click',()=>{pg--;intro();});
    $('c-have').addEventListener('click',()=>form(false));}
  const RULES=[[/.{10,}/,'10 caractères au moins'],[/[A-Z]/,'une majuscule'],[/[a-z]/,'une minuscule'],[/[^A-Za-z]/,'un chiffre ou un signe']];
  const strong=p=>RULES.every(([re])=>re.test(p));
  function rulesHtml(p){return RULES.map(([re,l])=>`<li class="${re.test(p)?'ok':''}">${l}</li>`).join('');}
  const head=t=>`<p class="eyebrow">FeelShareLove <span class="beta-tag">BÊTA</span></p><h1>${t}</h1>`;
  /* se reconnecter : adresse et mot de passe */
  function form(isNew){
  if(isNew&&DB.verifyToken&&DB.verifyToken())return password();
  if(isNew)return signup();
  S.innerHTML=head('Me reconnecter')+`
  <p class="muted" style="margin:10px 0 18px">Ton adresse e-mail reste privée : personne ne la voit, jamais de publicité.</p>
  <div class="sec" style="margin-top:0">
    <label class="muted small" for="c-mail">Adresse e-mail</label><input class="in" id="c-mail" type="email" autocomplete="email" style="margin:6px 0 12px">
    <label class="muted small" for="c-pass">Mot de passe</label><input class="in" id="c-pass" type="password" autocomplete="current-password" style="margin:6px 0 14px">
    <div class="row" style="justify-content:flex-start;flex-wrap:wrap;gap:10px"><button class="btn flame" type="button" id="c-log">Me connecter</button><button class="btn ghost" type="button" id="c-new">Créer un compte</button></div>
    <p class="small" id="c-err" style="margin-top:12px;color:var(--flame)"></p>
    <button class="linkbtn" type="button" id="c-forgot" style="margin-top:6px">Mot de passe oublié ?</button>
  </div>
  <div class="row" style="justify-content:flex-start;margin-top:10px"><button class="linkbtn" type="button" id="c-back">← Retour</button></div>`;
  async function go(){const e=$('c-mail').value.trim(),p=$('c-pass').value;$('c-err').textContent='';$('c-log').disabled=true;
    try{await DB.login(e,p);location.hash='#now';location.reload();}catch(x){$('c-err').textContent=x.message;$('c-log').disabled=false;}}
  $('c-log').addEventListener('click',go);$('c-pass').addEventListener('keydown',k=>{if(k.key==='Enter')go();});
  $('c-new').addEventListener('click',()=>signup());$('c-back').addEventListener('click',intro);
  $('c-forgot').addEventListener('click',()=>forgot($('c-mail').value.trim()));}
  /* créer un compte, étape 1 : l'adresse e-mail seule ; un lien part par e-mail */
  function signup(mail){
  S.innerHTML=head('Créer mon compte')+`
  <p class="muted" style="margin:10px 0 18px">Ici, on se rencontre par ce qui nous fait vibrer. Ton adresse e-mail reste privée : personne ne la voit, jamais de publicité.</p>
  <div class="sec" style="margin-top:0">
    <label class="muted small" for="c-mail">Adresse e-mail</label><input class="in" id="c-mail" type="email" autocomplete="email" style="margin:6px 0 12px">
    <p class="muted small" style="margin:0 0 12px">On t'envoie d'abord un e-mail avec un lien. C'est en cliquant sur ce lien que ton inscription continue : tu choisiras alors ton mot de passe.</p>
    <label class="check"><input type="checkbox" id="c-ok"> J'ai 18 ans ou plus, et j'ai lu l'<a href="#conditions" style="color:var(--saffron)">avertissement et les conditions</a>.</label>
    <div class="row" style="justify-content:flex-start;flex-wrap:wrap;gap:10px;margin-top:12px"><button class="btn flame" type="button" id="c-send">Recevoir le lien par e-mail</button><button class="btn ghost" type="button" id="c-log">J'ai déjà un compte</button></div>
    <p class="small" id="c-err" style="margin-top:12px;color:var(--flame)"></p>
  </div>
  <div class="row" style="justify-content:flex-start;margin-top:10px"><button class="linkbtn" type="button" id="c-back">← Retour</button></div>`;
  if(mail)$('c-mail').value=mail;
  async function go(){const e=$('c-mail').value.trim();$('c-err').textContent='';
    if(!$('c-ok').checked){$('c-err').textContent='Coche la case : 18 ans ou plus, avertissement et conditions lus.';return;}
    $('c-send').disabled=true;
    try{const r=await DB.start(e);if(r&&r.direct)return direct(e);sent(e);}
    catch(x){$('c-err').textContent=x.message;$('c-send').disabled=false;}}
  $('c-send').addEventListener('click',go);$('c-mail').addEventListener('keydown',k=>{if(k.key==='Enter')go();});
  $('c-log').addEventListener('click',()=>form(false));$('c-back').addEventListener('click',intro);}
  /* l'e-mail est parti : on attend le clic sur le lien */
  function sent(mail){
  S.innerHTML=head('Regarde tes e-mails')+`
  <div class="sec" style="margin-top:14px"><p class="exp">On vient d'envoyer un e-mail à <b>${esc(mail)}</b>. Clique sur le lien qu'il contient pour continuer ton inscription et choisir ton mot de passe. Le lien est valable 24 heures.</p>
    <p class="muted small" style="margin-top:10px">Rien reçu après quelques minutes ? Regarde dans les indésirables, puis renvoie l'e-mail.</p>
    <div class="row" style="justify-content:flex-start;flex-wrap:wrap;gap:10px;margin-top:12px"><button class="btn ghost" type="button" id="c-again">Renvoyer l'e-mail</button><button class="btn ghost" type="button" id="c-change">Changer d'adresse</button></div>
    <p class="small" id="c-err" style="margin-top:12px;color:var(--flame)"></p></div>`;
  $('c-again').addEventListener('click',async()=>{$('c-again').disabled=true;$('c-err').textContent='';try{await DB.start(mail);$('c-err').style.color='var(--saffron)';$('c-err').textContent='E-mail renvoyé.';}catch(x){$('c-err').style.color='var(--flame)';$('c-err').textContent=x.message;}setTimeout(()=>{$('c-again').disabled=false;},20000);});
  $('c-change').addEventListener('click',()=>signup(mail));}
  /* le lien a été cliqué : choix du mot de passe */
  function password(){
  S.innerHTML=head('Choisis ton mot de passe')+`
  <p class="muted" style="margin:10px 0 18px">Ton adresse est confirmée. Il ne manque plus que ton mot de passe.</p>
  <div class="sec" style="margin-top:0">
    <label class="muted small" for="c-pass">Mot de passe</label><input class="in" id="c-pass" type="password" autocomplete="new-password" style="margin:6px 0 8px">
    <ul class="rules" id="c-rules">${rulesHtml('')}</ul>
    <label class="muted small" for="c-pass2" style="display:block;margin-top:12px">Le même, une deuxième fois</label><input class="in" id="c-pass2" type="password" autocomplete="new-password" style="margin:6px 0 14px">
    <div class="row" style="justify-content:flex-start;flex-wrap:wrap;gap:10px"><button class="btn flame" type="button" id="c-go">Créer mon compte</button></div>
    <p class="small" id="c-err" style="margin-top:12px;color:var(--flame)"></p>
  </div>
  <div class="row" style="justify-content:flex-start;margin-top:10px"><button class="linkbtn" type="button" id="c-restart">Recommencer avec une autre adresse</button></div>`;
  $('c-pass').addEventListener('input',()=>{$('c-rules').innerHTML=rulesHtml($('c-pass').value);});
  async function go(){const p=$('c-pass').value;$('c-err').textContent='';
    if(!strong(p)){$('c-err').textContent='Le mot de passe ne respecte pas encore les quatre règles.';return;}
    if(p!==$('c-pass2').value){$('c-err').textContent='Les deux mots de passe ne sont pas identiques.';return;}
    $('c-go').disabled=true;
    try{await DB.finish(p);location.hash='#accueil';location.reload();}
    catch(x){$('c-err').textContent=x.message;$('c-go').disabled=false;if(x.code===410){DB.forgetVerify();setTimeout(()=>signup(),2500);}}}
  $('c-go').addEventListener('click',go);$('c-pass2').addEventListener('keydown',k=>{if(k.key==='Enter')go();});
  $('c-restart').addEventListener('click',()=>{DB.forgetVerify();signup();});}
  /* mot de passe oublié, étape 1 : l'adresse ; un lien part par e-mail */
  function forgot(mail){
  S.innerHTML=head('Mot de passe oublié')+`
  <div class="sec" style="margin-top:14px"><p class="exp">Indique l'adresse e-mail de ton compte. On t'envoie un lien pour choisir un nouveau mot de passe (valable 1 heure).</p>
    <label class="muted small" for="c-mail" style="display:block;margin-top:12px">Adresse e-mail</label><input class="in" id="c-mail" type="email" autocomplete="email" style="margin:6px 0 12px">
    <div class="row" style="justify-content:flex-start;flex-wrap:wrap;gap:10px"><button class="btn flame" type="button" id="c-send">Recevoir le lien par e-mail</button></div>
    <p class="small" id="c-err" style="margin-top:12px;color:var(--flame)"></p></div>
  <div class="row" style="justify-content:flex-start;margin-top:10px"><button class="linkbtn" type="button" id="c-back">← Retour</button></div>`;
  if(mail)$('c-mail').value=mail;
  async function go(){const e=$('c-mail').value.trim();$('c-err').textContent='';$('c-send').disabled=true;
    try{await DB.forgot(e);S.innerHTML=head('Regarde tes e-mails')+`<div class="sec" style="margin-top:14px"><p class="exp">Si un compte existe avec l'adresse <b>${esc(e)}</b>, un e-mail vient de partir avec un lien pour choisir un nouveau mot de passe. Le lien est valable 1 heure.</p><p class="muted small" style="margin-top:10px">Rien reçu après quelques minutes ? Regarde dans les indésirables.</p></div><div class="row" style="justify-content:flex-start;margin-top:10px"><button class="linkbtn" type="button" id="c-back">← Retour</button></div>`;$('c-back').addEventListener('click',()=>form(false));}
    catch(x){$('c-err').textContent=x.message;$('c-send').disabled=false;}}
  $('c-send').addEventListener('click',go);$('c-mail').addEventListener('keydown',k=>{if(k.key==='Enter')go();});
  $('c-back').addEventListener('click',()=>form(false));}
  /* mot de passe oublié, étape 2 : le lien a été cliqué */
  function newPass(){
  S.innerHTML=head('Nouveau mot de passe')+`
  <div class="sec" style="margin-top:14px">
    <label class="muted small" for="c-pass">Mot de passe</label><input class="in" id="c-pass" type="password" autocomplete="new-password" style="margin:6px 0 8px">
    <ul class="rules" id="c-rules">${rulesHtml('')}</ul>
    <label class="muted small" for="c-pass2" style="display:block;margin-top:12px">Le même, une deuxième fois</label><input class="in" id="c-pass2" type="password" autocomplete="new-password" style="margin:6px 0 14px">
    <div class="row" style="justify-content:flex-start"><button class="btn flame" type="button" id="c-go">Enregistrer le mot de passe</button></div>
    <p class="muted small" style="margin-top:10px">Les autres appareils connectés à ton compte seront déconnectés.</p>
    <p class="small" id="c-err" style="margin-top:12px;color:var(--flame)"></p></div>`;
  $('c-pass').addEventListener('input',()=>{$('c-rules').innerHTML=rulesHtml($('c-pass').value);});
  async function go(){const p=$('c-pass').value;$('c-err').textContent='';
    if(!strong(p)){$('c-err').textContent='Le mot de passe ne respecte pas encore les quatre règles.';return;}
    if(p!==$('c-pass2').value){$('c-err').textContent='Les deux mots de passe ne sont pas identiques.';return;}
    $('c-go').disabled=true;
    try{await DB.resetPass(p);location.hash='#now';location.reload();}
    catch(x){$('c-err').textContent=x.message;$('c-go').disabled=false;if(x.code===410){DB.forgetReset();setTimeout(()=>forgot(),2500);}}}
  $('c-go').addEventListener('click',go);$('c-pass2').addEventListener('keydown',k=>{if(k.key==='Enter')go();});}
  /* sans serveur d'e-mails (secours) : mot de passe tout de suite */
  function direct(mail){
  S.innerHTML=head('Choisis ton mot de passe')+`
  <div class="sec" style="margin-top:14px"><p class="muted small">Adresse : <b>${esc(mail)}</b></p>
    <label class="muted small" for="c-pass">Mot de passe</label><input class="in" id="c-pass" type="password" autocomplete="new-password" style="margin:6px 0 8px"><ul class="rules" id="c-rules">${rulesHtml('')}</ul>
    <div class="row" style="justify-content:flex-start;margin-top:12px"><button class="btn flame" type="button" id="c-go">Créer mon compte</button></div><p class="small" id="c-err" style="margin-top:12px;color:var(--flame)"></p></div>`;
  $('c-pass').addEventListener('input',()=>{$('c-rules').innerHTML=rulesHtml($('c-pass').value);});
  $('c-go').addEventListener('click',async()=>{const p=$('c-pass').value;if(!strong(p)){$('c-err').textContent='Le mot de passe ne respecte pas encore les quatre règles.';return;}$('c-go').disabled=true;
    try{await DB.register(mail,p);location.hash='#accueil';location.reload();}catch(x){$('c-err').textContent=x.message;$('c-go').disabled=false;}});}
  if(DB.resetToken&&DB.resetToken())newPass();else if(DB.verifyToken&&DB.verifyToken())password();else intro();
};
