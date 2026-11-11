/* FeelShareLove — écran « Mes données ». En ligne : résumé lisible et téléchargement. La version locale (prototype) garde l'ancien écran technique. */
Pages._donneesLocal=async function(S,param){
  S.innerHTML=`<p class="eyebrow">Mes données</p>
  <h1>Ce que la base <span style="color:var(--flame)">contient</span></h1>
  <div class="sec" style="margin-top:16px"><h3>Sauvegarde</h3>
    <p class="exp">${DB.remote?'Tu peux télécharger une copie de toutes tes données dans un fichier.':'La base vit dans ton navigateur. Le fichier « feelsharelove-base.json » est ta copie de sécurité : garde-le dans le dossier FeelShareLove et recharge-le si la base s\'ouvre vide.'}</p>
    <div class="row" style="justify-content:flex-start"><button class="btn" type="button" id="exp">Sauvegarder dans un fichier</button><label class="btn ghost" style="cursor:pointer">Recharger un fichier<input type="file" id="imp" accept=".json,application/json" hidden></label></div>
    <p class="muted small" id="msg" style="margin-top:8px"></p>
  </div>
  <div class="sec"><h3>Tables</h3><div class="vis" id="tables"></div></div>
  <div class="sec"><h3>Mon profil (brut)</h3><pre id="raw" style="white-space:pre-wrap;font-size:12px;color:var(--muted);margin:0;overflow-x:auto"></pre></div>
  ${DB.remote?`<div class="sec"><h3>Supprimer mon compte</h3><p class="exp">La suppression se fait dans Réglages, rubrique Compte, avec une confirmation par e-mail.</p><a class="btn ghost" href="#reglages">Aller aux réglages</a></div>`
    :`<div class="sec"><h3 class="red">Zone dangereuse</h3><p class="exp">Efface tout : ton portrait, les conversations, les listes. Les quatre personnes fictives seront recréées au prochain lancement.</p><button class="btn danger" type="button" id="wipe">Tout effacer</button></div>`}`;

  const {$,esc}=App;
  async function stats(){const T=$('tables');T.innerHTML='';for(const n of ['profiles','entries','questions','messages','threads','voices','lists','reports','circles','circlePosts','settings']){const rows=await DB.all(n);T.innerHTML+=`<div><span>${n}</span><span class="s">${rows.length} ligne${rows.length>1?'s':''}</span></div>`;}
    const me=await DB.get('profiles','me');const {photo,...rest}=me||{};$('raw').textContent=JSON.stringify(rest,null,1);}
  stats();
  $('exp').addEventListener('click',async()=>{const data=await DB.exportAll();const blob=new Blob([JSON.stringify(data,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='feelsharelove-base.json';document.body.appendChild(a);a.click();a.remove();$('msg').textContent='Fichier créé dans tes Téléchargements : feelsharelove-base.json';});
  $('imp').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async()=>{try{await DB.importAll(JSON.parse(r.result));$('msg').textContent='Base rechargée.';stats();}catch(err){$('msg').textContent='Fichier illisible ou pas une sauvegarde FeelShareLove.';}};r.readAsText(f);e.target.value='';});
  if($('wipe'))$('wipe').addEventListener('click',async()=>{if(!$('wipe').dataset.arm){$('wipe').dataset.arm='1';$('wipe').textContent='Confirmer : tout effacer';setTimeout(()=>{delete $('wipe').dataset.arm;$('wipe').textContent='Tout effacer';},4000);return;}await DB.wipe();await DB.ensureSeed();location.hash='#portrait';});

};
Pages.donnees=async function(S,param){
  if(!DB.remote)return Pages._donneesLocal(S,param);
  const {$}=App;
  S.innerHTML=`<p class="eyebrow">Mes données</p><h1>Ce que FeelShareLove garde de toi</h1>
  <p class="muted" style="margin:10px 0 4px">Tes données sont enregistrées sur nos serveurs, dans l'Union européenne. Elles ne sont ni vendues ni utilisées pour de la publicité.</p>
  <div class="sec" style="margin-top:14px"><h3>En résumé</h3><div class="vis" id="tables"></div></div>
  <div class="sec"><h3>Télécharger mes données</h3><p class="exp">Tu peux télécharger une copie de tout ce que tu as enregistré : ton portrait, ce qui te fait vibrer, tes questions, tes conversations et tes messages.</p>
    <div class="row" style="justify-content:flex-start"><button class="btn" type="button" id="exp">Télécharger mes données</button></div><p class="muted small" id="msg" style="margin-top:8px"></p></div>
  <div class="sec"><h3>Corriger ou effacer</h3><p class="exp">Tu peux modifier ton portrait à tout moment. Pour tout effacer, supprime ton compte dans Réglages, rubrique Compte, avec une confirmation par e-mail.</p>
    <div class="row" style="justify-content:flex-start;flex-wrap:wrap;gap:10px"><a class="btn ghost" href="#reglages">Aller aux réglages</a><a class="btn ghost" href="#legal">Politique de confidentialité</a></div></div>`;
  let data=null;const load=async()=>data||(data=await DB.exportAll());
  load().then(d=>{const n=k=>(d.data[k]||[]).length;if(!$('tables'))return;
    $('tables').innerHTML=[[`Choses qui te font vibrer`,n('entries')],['Questions ouvertes',n('questions')],['Conversations',n('threads')],['Messages',n('messages')],['Signalements envoyés',n('reports')]].map(r=>`<div><span>${r[0]}</span><span class="s">${r[1]}</span></div>`).join('');}).catch(()=>{});
  $('exp').addEventListener('click',async()=>{try{const d=await load();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,1)],{type:'application/json'}));a.download='feelsharelove-mes-donnees.json';document.body.appendChild(a);a.click();a.remove();
    $('msg').textContent=`Fichier créé dans tes Téléchargements : feelsharelove-mes-donnees.json`;}catch(e){$('msg').textContent=`Le téléchargement n'a pas marché. Réessaie dans un instant.`;}});
};
