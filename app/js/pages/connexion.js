/* FeelShareLove — écran « Connexion » (version en ligne seulement) : créer un compte ou se reconnecter */
Pages.connexion=function(S){
  const $=id=>document.getElementById(id);
  document.body.classList.add('onboarding');
  /* page d'accueil : la profession de foi, puis « Commencer » qui ouvre la création du compte */
  const ic=k=>window.Plus?Plus.icon(k,'manif-ic'):'';
  const PAGES=[
  `<p class="eyebrow">FeelShareLove</p><h1>Recréer <em>du lien</em></h1>
  <p>Aujourd'hui, <b>de très nombreuses personnes sont seules</b>. Le sentiment de rejet et d'abandon est partagé par des gens de tout âge, sur tous les continents. 🌍</p>
  <p>Notre société numérique nous isole toujours davantage : <i>chacun chez soi</i>, devant sa télévision, son téléphone ou son ordinateur, à consommer des vidéos.</p>
  <p>Les « réseaux sociaux » ne sont plus des réseaux sociaux. Ce sont <b>des vitrines commerciales</b>, où un algorithme décide à notre place de ce que nous regardons, pour nous garder captifs le plus longtemps possible.</p>`,
  `<p class="eyebrow">Notre réponse</p><h1>Ce qui nous <em>fait vibrer</em></h1>
  <p>Il nous paraît vital de casser ce cercle qui mène tant de personnes à la solitude. Notre réponse est simple : <b>recréer du lien</b>.</p>
  <p>Rapprocher les gens <i>par ce qu'ils aiment</i>, <i>par leur manière de fonctionner</i>, <i>par ce qui les fait vibrer</i>.</p>
  <p>Puisque le numérique est partout, autant qu'il serve à nous relier. FeelShareLove te permet de <b>rencontrer des inconnus qui te ressemblent</b>, d'échanger par messages écrits ou vocaux, puis, nous l'espérons, de vous retrouver <b>dans la vraie vie</b>.</p>
  <p class="manif-no">Ici, <b>pas de publicité</b>, <b>pas de vidéos</b> à faire défiler, et <b>personne ne choisit à ta place</b> qui tu rencontres.</p>`,
  `<p class="eyebrow">Comment ça marche</p><h1>De la résonance <em>à la tribu</em></h1>
  <div class="manif-step">${ic('port')}<p><b>1. Ton portrait.</b> Nous te demanderons comment tu fonctionnes, quels sont tes goûts, quelles passions tu poursuis : <i>qui tu es, avec précision</i>. Tout ne sera pas visible : l'essentiel sert à calculer ta <b>résonance</b> avec d'autres personnes, près de chez toi ou ailleurs dans le monde.</p></div>
  <div class="manif-step">${ic('res')}<p><b>2. Tes résonances.</b> Tu vois avec qui tu résonnes et tu découvres une partie de son profil, mais pas tout.</p></div>
  <div class="manif-step">${ic('msg')}<p><b>3. Le premier message.</b> Si un goût commun t'emballe (le même film, la même chanson, le même jeu vidéo, le même musée ou la même région du monde), écris-lui. Dès que cette personne te répond, vous voyez davantage l'un de l'autre.</p></div>
  <div class="manif-step">${ic('tribu')}<p><b>4. La tribu.</b> Si vous vous ajoutez tous les deux à votre cercle intime, vous êtes de la même tribu : la plupart de ce que vous avez choisi de partager devient visible l'un pour l'autre. Vous devenez <i>intimes de passions, de sentiments, de fonctionnement</i>, et il y a de bonnes chances que vous deveniez de vrais amis, ou plus si vous le souhaitez. ❤️</p></div>`];
  let pg=0;
  function intro(){const last=pg===PAGES.length-1;
    S.innerHTML=`<div class="row" style="justify-content:flex-end;margin:0 0 6px"><button class="linkbtn" type="button" id="c-have">J'ai déjà un compte</button></div>
    <div class="manif">${PAGES[pg]}</div>
    <div class="manif-dots">${PAGES.map((x,i)=>`<i class="${i===pg?'on':''}"></i>`).join('')}</div>
    <div class="row" style="justify-content:space-between;margin:14px 0 8px">${pg?'<button class="linkbtn" type="button" id="c-prev">← Retour</button>':'<span></span>'}
      <button class="btn flame" type="button" id="c-next">${last?'Commencer':'Suivant →'}</button></div>`;
    S.scrollTop=0;
    $('c-next').addEventListener('click',()=>{if(last)form(true);else{pg++;intro();}});
    const pv=$('c-prev');if(pv)pv.addEventListener('click',()=>{pg--;intro();});
    $('c-have').addEventListener('click',()=>form(false));}
  function form(isNew){
  S.innerHTML=`<p class="eyebrow">FeelShareLove</p><h1>${isNew?'Créer mon compte':'Me reconnecter'}</h1>
  <p class="muted" style="margin:10px 0 18px">Ici, on se rencontre par ce qui nous fait vibrer. Ton adresse e-mail reste privée : personne ne la voit, jamais de publicité.</p>
  <div class="sec" style="margin-top:0">
    <label class="muted small" for="c-mail">Adresse e-mail</label><input class="in" id="c-mail" type="email" autocomplete="email" style="margin:6px 0 12px">
    <label class="muted small" for="c-pass">Mot de passe (8 caractères au moins)</label><input class="in" id="c-pass" type="password" autocomplete="current-password" style="margin:6px 0 14px">
    <div class="row" style="justify-content:flex-start;flex-wrap:wrap;gap:10px"><button class="btn flame" type="button" id="c-new">Créer mon compte</button><button class="btn ghost" type="button" id="c-log">Me connecter</button></div>
    <p class="small" id="c-err" style="margin-top:12px;color:var(--flame)"></p>
  </div>
  <div class="row" style="justify-content:flex-start;margin-top:10px"><button class="linkbtn" type="button" id="c-back">← Retour</button></div>
  <p class="muted small" style="margin-top:14px">En créant un compte, tu confirmes avoir 18 ans ou plus. <a href="#conditions" style="color:var(--saffron)">Aide et conditions</a></p>`;
  async function go(kind){const e=$('c-mail').value.trim(),p=$('c-pass').value;$('c-err').textContent='';
    $('c-new').disabled=$('c-log').disabled=true;
    try{await (kind==='new'?DB.register(e,p):DB.login(e,p));location.hash=kind==='new'?'#accueil':'#now';location.reload();}
    catch(x){$('c-err').textContent=x.message;$('c-new').disabled=$('c-log').disabled=false;}}
  $('c-new').addEventListener('click',()=>go('new'));
  $('c-log').addEventListener('click',()=>go('log'));
  $('c-pass').addEventListener('keydown',k=>{if(k.key==='Enter')go(isNew?'new':'log');});
  $('c-back').addEventListener('click',intro);}
  intro();
};
