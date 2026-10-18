/* Connect — écran « donnees » */
Pages.donnees=async function(S,param){
  S.innerHTML=`<p class="eyebrow">Mes données</p>
  <h1>Ce que la base <span style="color:var(--flame)">contient</span></h1>
  <div class="sec" style="margin-top:16px"><h3>Sauvegarde</h3>
    <p class="exp">La base vit dans ton navigateur. Le fichier « connect-base.json » est ta copie de sécurité : garde-le dans le dossier Connect et recharge-le si la base s'ouvre vide.</p>
    <div class="row" style="justify-content:flex-start"><button class="btn" type="button" id="exp">Sauvegarder dans un fichier</button><label class="btn ghost" style="cursor:pointer">Recharger un fichier<input type="file" id="imp" accept=".json,application/json" hidden></label></div>
    <p class="muted small" id="msg" style="margin-top:8px"></p>
  </div>
  <div class="sec"><h3>Tables</h3><div class="vis" id="tables"></div></div>
  <div class="sec"><h3>Mon profil (brut)</h3><pre id="raw" style="white-space:pre-wrap;font-size:12px;color:var(--muted);margin:0;overflow-x:auto"></pre></div>
  <div class="sec"><h3 class="red">Zone dangereuse</h3><p class="exp">Efface tout : ton portrait, les conversations, les listes. Les quatre personnes fictives seront recréées au prochain lancement.</p><button class="btn danger" type="button" id="wipe">Tout effacer</button></div>`;

  const {$,esc}=App;
  async function stats(){const T=$('tables');T.innerHTML='';for(const n of ['profiles','entries','questions','messages','threads','voices','lists','reports','circles','circlePosts','settings']){const rows=await DB.all(n);T.innerHTML+=`<div><span>${n}</span><span class="s">${rows.length} ligne${rows.length>1?'s':''}</span></div>`;}
    const me=await DB.get('profiles','me');const {photo,...rest}=me||{};$('raw').textContent=JSON.stringify(rest,null,1);}
  stats();
  $('exp').addEventListener('click',async()=>{const data=await DB.exportAll();const blob=new Blob([JSON.stringify(data,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='connect-base.json';document.body.appendChild(a);a.click();a.remove();$('msg').textContent='Fichier créé dans tes Téléchargements : connect-base.json';});
  $('imp').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async()=>{try{await DB.importAll(JSON.parse(r.result));$('msg').textContent='Base rechargée.';stats();}catch(err){$('msg').textContent='Fichier illisible ou pas une sauvegarde Connect.';}};r.readAsText(f);e.target.value='';});
  $('wipe').addEventListener('click',async()=>{if(!$('wipe').dataset.arm){$('wipe').dataset.arm='1';$('wipe').textContent='Confirmer : tout effacer';setTimeout(()=>{delete $('wipe').dataset.arm;$('wipe').textContent='Tout effacer';},4000);return;}await DB.wipe();await DB.ensureSeed();location.hash='#portrait';});

};
