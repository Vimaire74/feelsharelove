/* FeelShareLove — écran « Connexion » (version en ligne seulement) : créer un compte ou se reconnecter */
Pages.connexion=function(S){
  const $=id=>document.getElementById(id);
  document.body.classList.add('onboarding');
  S.innerHTML=`<p class="eyebrow">FeelShareLove</p><h1>Bienvenue</h1>
  <p class="muted" style="margin:10px 0 18px">Ici, on se rencontre par ce qui nous fait vibrer. Ton adresse e-mail reste privée : personne ne la voit, jamais de publicité.</p>
  <div class="sec" style="margin-top:0">
    <label class="muted small" for="c-mail">Adresse e-mail</label><input class="in" id="c-mail" type="email" autocomplete="email" style="margin:6px 0 12px">
    <label class="muted small" for="c-pass">Mot de passe (8 caractères au moins)</label><input class="in" id="c-pass" type="password" autocomplete="current-password" style="margin:6px 0 14px">
    <div class="row" style="justify-content:flex-start;flex-wrap:wrap;gap:10px"><button class="btn flame" type="button" id="c-new">Créer mon compte</button><button class="btn ghost" type="button" id="c-log">Me connecter</button></div>
    <p class="small" id="c-err" style="margin-top:12px;color:var(--flame)"></p>
  </div>
  <p class="muted small" style="margin-top:14px">En créant un compte, tu confirmes avoir 18 ans ou plus. <a href="#conditions" style="color:var(--saffron)">Aide et conditions</a></p>`;
  async function go(kind){const e=$('c-mail').value.trim(),p=$('c-pass').value;$('c-err').textContent='';
    $('c-new').disabled=$('c-log').disabled=true;
    try{await (kind==='new'?DB.register(e,p):DB.login(e,p));location.hash=kind==='new'?'#accueil':'#now';location.reload();}
    catch(x){$('c-err').textContent=x.message;$('c-new').disabled=$('c-log').disabled=false;}}
  $('c-new').addEventListener('click',()=>go('new'));
  $('c-log').addEventListener('click',()=>go('log'));
  $('c-pass').addEventListener('keydown',k=>{if(k.key==='Enter')go('log');});
};
