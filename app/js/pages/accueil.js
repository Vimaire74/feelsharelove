/* Connect — accueil à la première ouverture (5 étapes) et choix du pseudo */
App.pseudoPicker=function(me,onPick){
  const {esc,FAMILIES}=App;const w=document.createElement('div');w.className='pseudo-pick';
  const first=(me.name||'').trim().split(/[\s-]+/)[0]||'';
  const letters=[...first].map(c=>({c,on:true}));
  let fam='fantastique',order='before',choice='';
  const cap=s=>s.charAt(0).toUpperCase()+s.slice(1).toLowerCase();
  const base=()=>cap(letters.filter(l=>l.on).map(l=>l.c).join(''));
  const combine=word=>{word=word.replace(/\s/g,'');return order==='before'?base()+word:word+base();};
  w.innerHTML=`<div class="pp-label">Ton prénom</div><p class="muted small">Touche une lettre pour l'enlever, touche-la à nouveau pour la remettre.</p>
    <div class="letters"></div><div class="pp-base"></div>
    <div class="pp-label">Place du prénom</div><div class="intent ord" style="margin-top:8px"><button class="chip on" type="button" data-o="before">Prénom puis mot</button><button class="chip" type="button" data-o="after">Mot puis prénom</button></div>
    <div class="pp-label">Famille de mots</div><div class="intent fam" style="margin-top:8px">${Object.entries(FAMILIES).map(([k,f])=>`<button class="chip ${k===fam?'on':''}" type="button" data-f="${k}">${f.l}</button>`).join('')}</div>
    <div class="props"></div><div class="row" style="justify-content:space-between;margin-top:10px"><button class="btn ghost" type="button" data-a="more">Autres propositions</button><button class="btn" type="button" data-a="ok" disabled>Choisir ce pseudo</button></div>`;
  const L=w.querySelector('.letters'),props=w.querySelector('.props'),ok=w.querySelector('[data-a=ok]'),B=w.querySelector('.pp-base');
  let words=[];
  function pickWords(){const birth=me.facts&&me.facts.birth&&me.facts.birth.v;let pool=FAMILIES[fam].w.slice().sort(()=>Math.random()-.5);
    if(fam==='signe'&&birth){const z=App.zodiac(birth),c=App.chineseAnimal(birth);pool=[z,c,...pool.filter(x=>x!==z&&x!==c)];}
    words=pool.slice(0,12);}
  function drawLetters(){L.innerHTML=letters.map((l,i)=>`<button type="button" class="lt ${l.on?'':'off'}" data-i="${i}">${esc(l.c)}</button>`).join('');
    L.querySelectorAll('.lt').forEach(b=>b.addEventListener('click',()=>{const l=letters[+b.dataset.i];if(l.on&&letters.filter(x=>x.on).length<=2)return;l.on=!l.on;choice='';ok.disabled=true;drawLetters();drawProps();}));
    B.textContent=base()||'';}
  function drawProps(){if(!first){props.innerHTML='<p class="muted small">Écris d\'abord ton prénom.</p>';return;}
    props.innerHTML=words.map(x=>{const v=combine(x);return `<button type="button" class="ps ${v===choice?'on':''}">${esc(v)}</button>`;}).join('');
    props.querySelectorAll('.ps').forEach(b=>b.addEventListener('click',()=>{choice=b.textContent;props.querySelectorAll('.ps').forEach(x=>x.classList.toggle('on',x===b));ok.disabled=false;}));}
  w.querySelectorAll('.ord .chip').forEach(c=>c.addEventListener('click',()=>{order=c.dataset.o;w.querySelectorAll('.ord .chip').forEach(x=>x.classList.toggle('on',x===c));choice='';ok.disabled=true;drawProps();}));
  w.querySelectorAll('.fam .chip').forEach(c=>c.addEventListener('click',()=>{fam=c.dataset.f;w.querySelectorAll('.fam .chip').forEach(x=>x.classList.toggle('on',x===c));pickWords();choice='';ok.disabled=true;drawProps();}));
  w.querySelector('[data-a=more]').addEventListener('click',()=>{pickWords();drawProps();});
  ok.addEventListener('click',()=>{if(choice)onPick(choice);});
  pickWords();drawLetters();drawProps();return w;
};
Pages.accueil=async function(S){
  const {$,esc,INTENT_LABEL}=App;let {me,entries}=await App.loadMe();let step=1;const N=5;
  const save=()=>DB.put('profiles',me);
  async function render(){S.scrollTop=0;
    const head=`<div class="steps"><span>Étape ${step} sur ${N}</span><div class="bar-p"><i style="width:${step/N*100}%"></i></div></div>`;
    if(step===1){S.innerHTML=head+`<p class="eyebrow">Bienvenue</p><h1>Connect relie les gens par ce qui les touche.</h1>
      <p class="muted" style="margin:12px 0 18px">Pas de photos à faire défiler. Tu te présentes par ce que tu aimes, et pourquoi.</p>
      <div class="fact"><div class="k">Ton prénom <span class="muted" style="text-transform:none;letter-spacing:0">(il reste privé)</span></div><div class="v"><input class="in" id="a-name" placeholder="Prénom"></div></div>
      <div class="fact" style="margin-top:8px"><div class="k">Ton nom <span class="muted" style="text-transform:none;letter-spacing:0">(privé, sert à la vérification)</span></div><div class="v"><input class="in" id="a-last" placeholder="Nom de famille"></div></div>
      <div class="fact" style="margin-top:8px"><div class="k">Écris-moi</div><div class="intent" id="a-acc" style="margin-top:4px"><button class="chip" type="button" data-a="m">au masculin</button><button class="chip" type="button" data-a="f">au féminin</button><button class="chip" type="button" data-a="n">de façon neutre</button></div></div>
      <label class="check"><input type="checkbox" id="a-18"> J'ai 18 ans ou plus, et j'accepte les <a href="#conditions">conditions d'utilisation</a>.</label>
      <div class="row"><button class="btn" type="button" id="next">Continuer</button></div><p class="muted small" id="err"></p>`;
      $('a-name').value=me.name||'';
      const accs=S.querySelectorAll('#a-acc .chip');accs.forEach(c=>{c.classList.toggle('on',me.accord===c.dataset.a);c.addEventListener('click',()=>{me.accord=c.dataset.a;accs.forEach(x=>x.classList.toggle('on',x===c));});});$('a-last').value=me.lastName||'';$('a-18').checked=!!me.adultAt;
      $('next').addEventListener('click',async()=>{const n=$('a-name').value.trim();const ln=$('a-last').value.trim();if(!n||!ln){$('err').textContent='Prénom et nom sont nécessaires. Ils restent privés.';return;}me.lastName=ln;if(!$('a-18').checked){$('err').textContent='Connect est réservé aux adultes.';return;}
        me.name=n;me.adultAt=me.adultAt||Date.now();await save();step=2;render();});return;}
    if(step===2){S.innerHTML=head+`<p class="eyebrow">Ton pseudo</p><h1>Comment les autres te verront</h1><p class="muted" style="margin:10px 0">Ton prénom reste privé. Les autres voient un pseudo composé à partir de ton prénom et d'un mot qui dit un petit quelque chose de toi.</p><div id="pp"></div><div class="row" style="justify-content:flex-start"><button class="linkbtn" type="button" id="back">← Retour</button></div>`;
      $('pp').appendChild(App.pseudoPicker(me,async ps=>{me.pseudo=ps;await save();step=3;render();}));$('back').addEventListener('click',()=>{step=1;render();});return;}
    if(step===3){S.innerHTML=head+`<p class="eyebrow">Ce que tu cherches</p><h1>${esc(me.pseudo)}, qu'est-ce qui t'amène ?</h1>
      <div class="intent" id="intent">${Object.entries(INTENT_LABEL).map(([k,l])=>`<button class="chip ${(me.intent||[]).includes(k)?'on':''}" type="button" data-k="${k}">${l}</button>`).join('')}</div>
      <div class="fact" style="margin-top:14px"><div class="k">Ville et code postal</div><div class="v" style="display:flex;gap:10px"><input class="in" id="a-npa" placeholder="NPA" style="max-width:80px"><input class="in" id="a-city" placeholder="Ville"></div></div>
      <div class="now"><p class="eyebrow">En ce moment</p><textarea class="ta" id="a-now" rows="2" placeholder="Ce que je traverse, ce dont j'ai envie…"></textarea></div>
      <div class="row" style="justify-content:space-between;margin-top:14px"><button class="linkbtn" type="button" id="back">← Retour</button><button class="btn" type="button" id="next">Continuer</button></div>`;
      $('a-city').value=me.city||'';$('a-npa').value=me.npa||'';$('a-now').value=me.now||'';App.grow($('a-now'));$('a-now').addEventListener('input',e=>App.grow(e.target));
      $('intent').querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>c.classList.toggle('on')));
      $('back').addEventListener('click',()=>{step=2;render();});
      $('next').addEventListener('click',async()=>{me.intent=[...$('intent').querySelectorAll('.chip.on')].map(x=>x.dataset.k);me.city=$('a-city').value.trim();me.npa=$('a-npa').value.trim();me.now=$('a-now').value.trim();await save();step=4;render();});return;}
    if(step===4){S.innerHTML=head+`<p class="eyebrow">Ce qui te fait vibrer</p><h1>Trois choses que tu aimes vraiment</h1><p class="muted" style="margin:10px 0">Un film, un livre, une musique, un lieu, un souvenir. Avec ce que ça te fait et pourquoi. C'est ce qui te reliera aux autres.</p>
      <div class="list" id="l"></div><div id="fs"></div><div class="add" id="add">+ Ajouter</div>
      <div class="row" style="justify-content:space-between;margin-top:14px"><button class="linkbtn" type="button" id="back">← Retour</button><button class="btn" type="button" id="next">${entries.length?'Continuer':'Plus tard'}</button></div>`;
      const L=$('l');entries.forEach((e,i)=>L.appendChild(App.entryEl(e,{edit:()=>{$('fs').innerHTML='';$('fs').appendChild(App.entryForm(e,async ne=>{entries[i]=await DB.put('entries',{...ne,profileId:'me'});render();},()=>render()));}})));
      $('add').addEventListener('click',()=>{$('add').hidden=true;$('fs').innerHTML='';$('fs').appendChild(App.entryForm({},async ne=>{entries.push(await DB.put('entries',{...ne,profileId:'me'}));render();},()=>render()));});
      $('back').addEventListener('click',()=>{step=3;render();});$('next').addEventListener('click',()=>{step=5;render();});return;}
    if(step===5){S.innerHTML=head+`<p class="eyebrow">Presque fini</p><h1>Ta photo, prise maintenant</h1><p class="muted" style="margin:10px 0">Sur Connect, la photo est prise en direct avec la caméra : pas d'import, pas de vieille photo retouchée. Le visage doit être reconnaissable. Une photo en pied est possible : pose le téléphone et utilise le retardateur.</p>
      <div class="hero"><div class="avatar"><img id="photo" alt="" hidden></div><div><h1>${esc(me.pseudo)}</h1><p class="muted">${esc([me.npa,me.city].filter(Boolean).join(' '))}</p></div></div>
      <div class="row" style="justify-content:flex-start;margin-top:12px"><button class="btn ghost" type="button" id="take">${me.photo?'Reprendre ma photo':'Prendre ma photo'}</button></div>
      <h2>Ce que les autres <em>verront</em></h2>
      <div class="sec"><p><b>${esc(me.pseudo)}</b>${me.city?' · '+esc(me.city):''}</p><p class="muted small">${(me.intent||[]).map(i=>INTENT_LABEL[i]).join(' · ')||'Intention non précisée'}</p>${me.now?`<p class="txt" style="margin-top:6px">${esc(me.now)}</p>`:''}<p class="muted small" style="margin-top:6px">${entries.length} chose${entries.length>1?'s':''} qui te ${entries.length>1?'font':'fait'} vibrer · ni ton prénom ni ton nom n'apparaissent</p></div>
      <p class="muted small" style="margin-top:10px">Tu pourras changer ta photo librement pendant un mois, puis une fois par an. Tu pourras aussi faire vérifier ton profil avec ta carte d'identité, dans Réglages.</p>
      <div class="row" style="justify-content:space-between;margin-top:14px"><button class="linkbtn" type="button" id="back">← Retour</button><button class="btn flame" type="button" id="go">Entrer dans Connect</button></div><p class="muted small" id="err"></p>`;
      if(me.photo){$('photo').src=me.photo;$('photo').hidden=false;}
      $('take').addEventListener('click',async()=>{const url=await App.camera({title:'Ta photo de portrait',hint:'Visage reconnaissable. Retardateur pour une photo en pied.'});if(!url)return;me.photo=url;me.photoAt=Date.now();await save();render();});
      $('back').addEventListener('click',()=>{step=4;render();});
      $('go').addEventListener('click',async()=>{if(!me.photo){$('err').textContent='La photo est nécessaire pour entrer : elle protège tout le monde des faux profils.';return;}me.onboardedAt=me.onboardedAt||Date.now();await save();location.hash='#now';});}
  }
  render();
};
