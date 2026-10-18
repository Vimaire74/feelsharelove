/* Connect — écran « Réglages » : listes rouge et noire, visibilité, signalements */
Pages.reglages=async function(S){
  const {$,esc,FACTS,dn}=App;const {me}=await App.loadMe();
  S.innerHTML=`<p class="eyebrow">Réglages</p><h1>Ce que je <span style="color:var(--flame)">protège</span></h1>
  <div class="sec" style="margin-top:16px"><h3 class="red">Liste rouge</h3><p class="exp">Les personnes que tu ne veux jamais croiser ici : un ex, un ennemi, un collègue. Elles ne te verront jamais, ni dans Résonances, ni dans Maintenant, ni dans les cercles, et ne sauront pas qu'elles sont sur cette liste. Écris leur vrai prénom et nom.</p>
    <div class="names" id="red-list"></div><div class="addrow"><input id="red-name" placeholder="Prénom et nom"><input id="red-hint" placeholder="Téléphone ou e-mail" style="flex:.9"><button class="btn danger" type="button" id="red-add">Ajouter</button></div></div>
  <div class="sec"><h3 class="black">Liste noire</h3><p class="exp">Les personnes qui t'ont écrit et que tu bloques. Elles ne peuvent plus t'écrire. Chaque blocage nous est transmis avec la conversation.</p>
    <div class="names" id="black-list"></div><div class="addrow"><input id="black-name" placeholder="Pseudo"><button class="btn ghost" type="button" id="black-add">Bloquer</button></div></div>
  <div class="sec"><h3>Ce que les autres voient</h3><p class="exp">Ton prénom n'est jamais affiché : on voit ${esc(dn(me))}. <a href="#apercu" style="color:var(--saffron)">Voir mon portrait comme les autres</a></p><div class="vis" id="vis"></div></div>
  <div class="sec" id="verif"></div>
  <div class="sec"><h3>Écris-moi</h3><p class="exp">Pour les phrases de l'app qui s'accordent (par exemple les réponses de refus).</p><div class="intent" id="acc" style="margin-top:0"><button class="chip" type="button" data-a="m">au masculin</button><button class="chip" type="button" data-a="f">au féminin</button><button class="chip" type="button" data-a="n">de façon neutre</button></div></div>
  <div class="sec" id="pause"></div>
  <div class="sec"><h3>Signalements envoyés</h3><div class="names" id="reports"></div></div>
  <div class="sec"><h3>Compte</h3><p class="exp"><a href="#donnees" style="color:var(--saffron)">Mes données : sauvegarder, recharger, tout effacer</a> · <a href="#conditions" style="color:var(--saffron)">Conditions</a>${DB.remote?' · <a href="#" id="logout" style="color:var(--saffron)">Se déconnecter</a>':''}</p></div>`;
  async function renderLists(){const lists=await DB.where('lists','owner','me');
    for(const [id,type,extra] of [['red-list','red',''],['black-list','black',' · signalé à Connect']]){const el=$(id);const arr=lists.filter(l=>l.type===type);el.innerHTML='';
      if(!arr.length){el.innerHTML='<p class="muted small">Personne pour l\'instant.</p>';continue;}
      arr.forEach(l=>{const r=document.createElement('div');r.className='nm-row';r.innerHTML=`<span>${esc(l.name)} <small>${esc(l.hint||'')}${extra}</small></span><button type="button">Retirer</button>`;
        r.querySelector('button').addEventListener('click',async()=>{await DB.del('lists',l.id);renderLists();});el.appendChild(r);});}}
  renderLists();
  $('red-add').addEventListener('click',async()=>{const n=$('red-name').value.trim();if(!n)return;await DB.put('lists',{owner:'me',type:'red',name:n,hint:$('red-hint').value.trim()});$('red-name').value='';$('red-hint').value='';renderLists();});
  $('black-add').addEventListener('click',async()=>{const n=$('black-name').value.trim();if(!n)return;await DB.put('lists',{owner:'me',type:'black',name:n});$('black-name').value='';renderLists();});
  const V=$('vis');FACTS.forEach(f=>{const s=(me.facts||{})[f.id]||{show:!f.hiddenDefault};let st=s.show?'visible':'caché';if(f.id==='birth'&&s.show)st=s.year?'visible avec l\'année':'jour et mois seulement';V.innerHTML+=`<div><span>${f.k}</span><span class="${s.show?'s':'h'}">${st}</span></div>`;});
  async function renderVerif(){const V=$('verif');const m=await DB.get('profiles','me');const v=m.verified||{};
    if(v.status==='verified'){V.innerHTML=`<h3>Ton profil est vérifié ${App.badge(m)}</h3><p class="exp">Vérifié le ${new Date(v.at).toLocaleDateString('fr-CH',{day:'numeric',month:'long',year:'numeric'})}. La photo de ta carte d'identité a été supprimée : Connect ne garde que la date.</p>`;return;}
    if(v.status==='pending'){V.innerHTML=`<h3>Vérification en cours</h3><p class="exp">Quelqu'un de l'équipe Connect compare ta carte avec ton nom et ta photo, en général sous 48 heures. S'il y a un doute, on t'écrit par e-mail. (Dans cette version locale, la réponse arrive en quelques secondes.)</p>`;
      setTimeout(async()=>{if(location.hash==='#reglages'&&await App.tickThreads())renderVerif();},Math.max(500,v.at+8200-Date.now()));return;}
    V.innerHTML=`<h3>Faire vérifier mon profil</h3><p class="exp">Facultatif. Photographie ta carte d'identité en la tenant à côté de ton visage, photo de la carte bien visible. On vérifie que le nom est ${m.lastName?'« '+esc(m.name+' '+m.lastName)+' »':'celui de ton inscription'} et que le visage est celui de ton portrait. Ensuite la photo de ta carte est supprimée et ton portrait affiche « vérifié ».</p>
      <button class="btn flame" type="button" id="v-go">Photographier ma carte avec mon visage</button><p class="muted small" id="v-err" style="margin-top:8px"></p>`;
    $('v-go').addEventListener('click',async()=>{if(!m.lastName||!m.name){$('v-err').innerHTML='Il faut d\'abord ton prénom et ton nom dans <a href="#portrait" style="color:var(--saffron)">ton portrait</a>.';return;}
      if(!m.photo){$('v-err').textContent='Il faut d\'abord une photo de portrait.';return;}
      const shot=await App.camera({title:'Ta carte et ton visage',hint:'Tiens ta carte d\'identité à côté de ton visage, côté photo, bien lisible.'});if(!shot)return;
      await DB.setting('idcheck',{shot,at:Date.now()});const f=await DB.get('profiles','me');f.verified={status:'pending',at:Date.now()};await DB.put('profiles',f);renderVerif();});}
  renderVerif();
  const accs=S.querySelectorAll('#acc .chip');accs.forEach(c=>{c.classList.toggle('on',(me.accord||'n')===c.dataset.a);c.addEventListener('click',async()=>{const m=await DB.get('profiles','me');m.accord=c.dataset.a;await DB.put('profiles',m);accs.forEach(x=>x.classList.toggle('on',x===c));});});
  async function renderPause(){const P=$('pause');const m=await DB.get('profiles','me');
    P.innerHTML=m.paused?`<h3>Ton portrait est en pause</h3><p class="exp">Depuis le ${new Date(m.paused).toLocaleDateString('fr-CH',{day:'numeric',month:'long'})}. Personne ne te voit dans Maintenant, Résonances ou les cercles, et personne ne peut t'écrire. Tes conversations ouvertes restent accessibles.</p><button class="btn flame" type="button" id="p-go">Revenir sur Connect</button>`
      :`<h3>Mettre mon portrait en pause</h3><p class="exp">Pour faire une pause sans tout effacer : ton portrait disparaît pour les autres et personne ne peut t'écrire, jusqu'à ce que tu reviennes.</p><button class="btn ghost" type="button" id="p-go">Mettre en pause</button>`;
    $('p-go').addEventListener('click',async()=>{const f=await DB.get('profiles','me');f.paused=f.paused?null:Date.now();if(f.paused)f.avail=null;await DB.put('profiles',f);renderPause();});}
  renderPause();
  if(DB.remote)$('logout').addEventListener('click',async e=>{e.preventDefault();await DB.logout();location.hash='';location.reload();});
  const profs=Object.fromEntries((await DB.all('profiles')).map(p=>[p.id,p]));
  const reps=await DB.all('reports');$('reports').innerHTML=reps.length?reps.map(r=>`<div class="nm-row"><span>${r.kind==='photo'?'Photo':r.kind==='block'?'Blocage':'Portrait'} · ${esc(dn(profs[r.target])||r.target)} <small>${esc(r.reason||'')} · ${r.status==='open'?'en cours':'traité'}</small></span></div>`).join(''):'<p class="muted small">Aucun.</p>';
};
