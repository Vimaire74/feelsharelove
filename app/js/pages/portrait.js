/* Connect — écran « Mon portrait » : tout s'enregistre dans la base locale à chaque modification */
Pages.portrait=async function(S){
  const {$,esc,grow,FACTS,zodiac,chinese}=App;
  let {me,entries,qs}=await App.loadMe();
  me.facts=me.facts||{};FACTS.forEach(f=>{if(!me.facts[f.id])me.facts[f.id]={v:'',show:!f.hiddenDefault,year:false};});
  if(!qs.length){for(const k of ["Un moment où j'ai pleuré devant un écran","L'odeur de mon enfance","La chose que je referais mille fois"])qs.push(await DB.put('questions',{profileId:'me',k,a:''}));}
  S.innerHTML=`<p class="eyebrow">Mon portrait</p>
  <div class="hero">
    <div class="avatar"><img id="photo" alt="" hidden></div>
    <div><h1 id="pseudo-h">${esc(me.pseudo)}</h1>${App.badge(me)}<div><button class="linkbtn" type="button" id="pseudo-change">Changer de pseudo</button></div></div>
  </div>
  <p class="muted small" id="pseudo-rule" style="margin-top:8px"></p>
  <div id="pseudo-pick" hidden></div>
  <div class="row" style="justify-content:flex-start;margin-top:10px"><button class="btn ghost" type="button" id="photo-take">Prendre ma photo</button></div>
  <p class="muted small" id="photo-rule" style="margin-top:6px"></p>
  <div class="facts" style="margin-top:14px">
    <div class="fact"><div class="k">Prénom <span class="muted" style="text-transform:none;letter-spacing:0">(privé, sert à ton pseudo et à la liste rouge)</span></div><div class="v"><input class="in" id="f-name" placeholder="Prénom"></div></div>
    <div class="fact"><div class="k">Nom <span class="muted" style="text-transform:none;letter-spacing:0">(privé, sert à la vérification)</span></div><div class="v"><input class="in" id="f-last" placeholder="Nom de famille"></div></div>
    <div class="fact"><div class="k">Ville et code postal</div><div class="v" style="display:flex;gap:10px"><input class="in" id="f-npa" placeholder="NPA" style="max-width:80px"><input class="in" id="f-place" placeholder="Ville"></div></div>
  </div>
  <div class="intent" id="intent">
    <button class="chip" type="button" data-k="parler">Quelqu'un à qui parler</button><button class="chip" type="button" data-k="amis">Des amis</button><button class="chip" type="button" data-k="amour">L'amour</button>
  </div>
  <div class="now"><p class="eyebrow">En ce moment</p><textarea class="ta" id="f-now" rows="2" placeholder="Ce que je traverse, ce dont j'ai envie…"></textarea></div>
  <div class="voice-box"><p class="eyebrow" style="margin:0">Ma voix · une minute pour me présenter</p><div id="voice"></div></div>

  <h2>Mon <em>fonctionnement</em></h2>
  <div class="sec" id="types-box"></div>
  <h2>Qui je <em>suis</em></h2>
  <p class="muted small" style="margin-bottom:10px">Chaque ligne a son bouton : visible pour les autres, ou gardée pour toi.</p>
  <div class="facts" id="facts"></div>

  <h2>Ce qui me fait <em>vibrer</em></h2>
  <p class="muted small" style="margin-bottom:10px">Pour chaque chose : le titre, ce que ça te fait, et pourquoi. C'est de là que partent les résonances.</p>
  <div class="list" id="list"></div><div id="form-slot"></div>
  <div class="add" id="add">+ Ajouter une œuvre, un lieu, une passion</div>

  <h2>Questions <em>ouvertes</em></h2>
  <p class="muted small" style="margin-bottom:4px">Touche une question pour y répondre ou la modifier.</p>
  <div id="qs"></div>
  <div class="qform" id="qform" hidden><label for="q-k">Question</label><input id="q-k" placeholder="Ma question"><label for="q-a">Ma réponse</label><textarea id="q-a" placeholder="En quelques lignes…"></textarea>
    <div class="row"><button class="btn ghost" type="button" id="q-cancel">Annuler</button><button class="btn" type="button" id="q-save">Valider</button></div></div>
  <div class="add" id="add-q" style="margin-top:12px">+ Ajouter ma propre question</div>
  <div class="foot"><span id="saved">Base locale</span><a href="#apercu" style="color:var(--saffron)">Ce que les autres voient</a></div>`;

  let t=null;function saveMe(){clearTimeout(t);t=setTimeout(async()=>{await DB.put('profiles',me);$('saved').textContent='Enregistré · '+new Date().toLocaleTimeString('fr-CH',{hour:'2-digit',minute:'2-digit'});},300);}
  $('f-name').value=me.name||'';$('f-place').value=me.city||'';$('f-last').value=me.lastName||'';$('f-npa').value=me.npa||'';
  $('f-last').addEventListener('input',e=>{me.lastName=e.target.value;saveMe();});$('f-npa').addEventListener('input',e=>{me.npa=e.target.value;saveMe();});$('f-now').value=me.now||'';grow($('f-now'));
  $('f-name').addEventListener('input',e=>{me.name=e.target.value;saveMe();});
  $('f-place').addEventListener('input',e=>{me.city=e.target.value;saveMe();});
  $('f-now').addEventListener('input',e=>{me.now=e.target.value;grow(e.target);saveMe();});
  function rules(){const pr=App.pseudoRule(me);$('pseudo-rule').textContent=pr.msg;$('pseudo-change').disabled=!pr.ok;$('pseudo-change').style.opacity=pr.ok?1:.4;
    const ph=App.photoRule(me);$('photo-rule').textContent=ph.msg||'Ta photo est prise en direct avec la caméra, pas importée. Le visage doit être reconnaissable ; une photo en pied est possible avec le retardateur.';$('photo-take').disabled=!ph.ok;$('photo-take').style.opacity=ph.ok?1:.4;$('photo-take').textContent=me.photo?'Changer ma photo':'Prendre ma photo';}
  rules();
  $('pseudo-change').addEventListener('click',()=>{if(!App.pseudoRule(me).ok)return;const P=$('pseudo-pick');P.hidden=!P.hidden;if(!P.hidden){P.innerHTML='<p class="muted small" style="margin-top:8px">Attention : c\'est ton seul changement possible.</p>';P.appendChild(App.pseudoPicker(me,async ps=>{me.pseudo=ps;me.pseudoChangedAt=Date.now();await DB.put('profiles',me);$('pseudo-h').textContent=ps;P.hidden=true;rules();}));}});
  if(me.photo){$('photo').src=me.photo;$('photo').hidden=false;}
  $('photo-take').addEventListener('click',async()=>{if(!App.photoRule(me).ok)return;const url=await App.camera({title:'Ta photo de portrait',hint:'Visage reconnaissable. Pour une photo en pied, pose le téléphone et utilise le retardateur.'});
    if(!url)return;const had=!!me.photo;me.photo=url;if(had)me.photoChangedAt=Date.now();me.photoAt=Date.now();await DB.put('profiles',me);$('photo').src=url;$('photo').hidden=false;rules();});
  document.querySelectorAll('#intent .chip').forEach(c=>{c.classList.toggle('on',(me.intent||[]).includes(c.dataset.k));c.addEventListener('click',()=>{c.classList.toggle('on');me.intent=[...document.querySelectorAll('#intent .chip.on')].map(x=>x.dataset.k);saveMe();});});

  /* présentation vocale */
  async function renderVoice(){const V=$('voice');V.innerHTML='';const v=await DB.get('voices','pres-me');
    if(v){V.appendChild(App.audioEl(v.blob));const del=document.createElement('button');del.className='linkbtn';del.type='button';del.textContent='Effacer et réenregistrer';del.addEventListener('click',async()=>{await DB.del('voices','pres-me');renderVoice();});V.appendChild(del);}
    else{V.appendChild(App.recorder('Enregistrer ma présentation',60,async(blob,secs)=>{await DB.put('voices',{id:'pres-me',owner:'me',kind:'presentation',blob,secs});renderVoice();}));
      const p=document.createElement('p');p.className='muted small';p.style.marginTop='6px';p.textContent='Firefox te demandera l\'accès au micro. Touche à nouveau pour arrêter.';V.appendChild(p);}}
  renderVoice();

  function renderTypes(){const B=$('types-box');const t=me.types;
    if(!t||!t.list||!t.list.length){B.innerHTML=`<p class="exp">Mental, émotionnel, sensible ou physique : comment tu fonctionnes, en 12 questions. Le résultat t'est montré, tu le valides ou le corriges, et tu choisis de l'afficher ou non.</p><a class="btn flame" href="#test">Faire le test</a>`;return;}
    B.innerHTML=`<div class="types-show">${t.list.map(k=>`<span class="ttag t-${k}">${TYPES.name(k)}</span>`).join('')}</div>
      <label class="check" style="margin:12px 0 8px"><input type="checkbox" id="t-show" ${t.show!==false?'checked':''}> Afficher sur mon portrait</label><a class="linkbtn" href="#test">Refaire le test</a>`;
    $('t-show').addEventListener('change',e=>{me.types.show=e.target.checked;saveMe();});}
  renderTypes();
  function renderFacts(){const F=$('facts');F.innerHTML='';
    FACTS.forEach(f=>{const s=me.facts[f.id];const d=document.createElement('div');d.className='fact'+(s.show?'':' hidden-f');let v='';
      if(f.type==='date')v=`<input class="in" type="date" value="${esc(s.v)}">`;
      else if(f.type==='auto'){const z=zodiac(me.facts.birth.v),c=chinese(me.facts.birth.v);v=`<span style="${z?'':'color:#8a6a60'}">${z?z+' · '+c:esc(f.ph)}</span>`;}
      else v=`<input class="in" value="${esc(s.v)}" placeholder="${esc(f.ph)}">`;
      d.innerHTML=`<div class="k">${f.k}</div><div class="v">${v}</div><button class="eye ${s.show?'on':''}" type="button">${s.show?'Visible':'Caché'}</button>`+(f.sub==='year'?`<div class="sub"><label><input type="checkbox" ${s.year?'checked':''}> montrer l'année (sinon seulement jour et mois, pour l'anniversaire)</label></div>`:'');
      const inp=d.querySelector('.v input');if(inp)inp.addEventListener('input',()=>{s.v=inp.value;saveMe();if(f.id==='birth')renderFacts();});
      d.querySelector('.eye').addEventListener('click',()=>{s.show=!s.show;saveMe();renderFacts();});
      const cb=d.querySelector('.sub input');if(cb)cb.addEventListener('change',()=>{s.year=cb.checked;saveMe();});
      F.appendChild(d);});}
  renderFacts();

  /* œuvres et passions */
  function closeForm(){$('form-slot').innerHTML='';$('add').style.display='';}
  function renderList(){const L=$('list');L.innerHTML='';
    if(!entries.length){L.innerHTML='<p class="muted" style="font-size:14px">Aucune entrée pour l\'instant.</p>';return;}
    entries.forEach((e,i)=>{const el=App.entryEl(e,{
      edit:()=>{const f=App.entryForm(e,async ne=>{const saved=await DB.put('entries',{...ne,profileId:'me'});entries[i]=saved;renderList();},()=>renderList());el.replaceWith(f);},
      del:async()=>{await DB.del('entries',e.id);entries.splice(i,1);renderList();}});
      if(!(e.feel&&e.feel.length)){const n=document.createElement('div');n.className='nudge';n.textContent='Ajoute ce que ça te fait : touche, puis Modifier.';el.appendChild(n);}
      L.appendChild(el);});}
  renderList();
  $('add').addEventListener('click',()=>{$('add').style.display='none';$('form-slot').innerHTML='';
    $('form-slot').appendChild(App.entryForm({},async ne=>{entries.push(await DB.put('entries',{...ne,profileId:'me'}));renderList();closeForm();},closeForm));});

  /* questions ouvertes */
  let qEdit=-1;
  function renderQs(){const Q=$('qs');Q.innerHTML='';
    qs.forEach((q,i)=>{const d=document.createElement('div');d.className='q';
      d.innerHTML=`<div class="k">${esc(q.k)||'(sans titre)'}</div><div class="a ${q.a?'':'empty'}">${esc(q.a)||'Touche pour répondre'}</div><button class="del" type="button">Retirer</button>`;
      d.querySelector('.del').addEventListener('click',async ev=>{ev.stopPropagation();await DB.del('questions',q.id);qs.splice(i,1);renderQs();});
      d.addEventListener('click',()=>openQ(i));Q.appendChild(d);});}
  function openQ(i){qEdit=i;const q=i>=0?qs[i]:{k:'',a:''};$('q-k').value=q.k;$('q-a').value=q.a;$('qform').hidden=false;$('add-q').style.display='none';(q.k?$('q-a'):$('q-k')).focus();$('qform').scrollIntoView({block:'nearest'});}
  function closeQ(){$('qform').hidden=true;$('add-q').style.display='';qEdit=-1;}
  renderQs();
  $('add-q').addEventListener('click',()=>openQ(-1));$('q-cancel').addEventListener('click',closeQ);
  $('q-save').addEventListener('click',async()=>{const k=$('q-k').value.trim(),a=$('q-a').value.trim();if(!k){$('q-k').focus();return;}
    if(qEdit>=0){qs[qEdit].k=k;qs[qEdit].a=a;await DB.put('questions',qs[qEdit]);}else qs.push(await DB.put('questions',{profileId:'me',k,a}));renderQs();closeQ();});
};
