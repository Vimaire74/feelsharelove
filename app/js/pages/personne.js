/* FeelShareLove — écran « Portrait d'une personne », et « Ce que les autres voient » (mon portrait vu de l'extérieur) */
Pages._view=async function(S,p,preview){
  const {$,esc,localTime,INTENT_LABEL,FACT_LABEL,FACTS,WANT,fem,dn,isAvail,hhmm,zodiac,chinese}=App;
  const {me,entries}=await App.loadMe();const r=preview?{common:[],feels:[]}:App.resonance(entries,p.entries);const nres=preview?0:r.common.length+r.feels.length+commonTypes(me,p).length+Plus.extraCommon(me,p).length;
  const commons=new Set(r.common.map(c=>c.theirs.id));const f=fem(p);const il=f?'elle':'il';
  /* faits visibles : pour moi, uniquement ceux que j'ai laissés visibles */
  let facts=[];const F=p.facts||{};
  /* faits d'un portrait : objets {v, show, year} (version en ligne) ou simple texte (anciennes données) */
  FACTS.forEach(x=>{let s=F[x.id];if(s==null)return;if(typeof s!=='object')s={v:s,show:true};if(!s.show)return;
    if(x.id==='sign'){const b=F.birth;let v=s.v;if(!v&&b&&b.v)v=(b.year||preview)?zodiac(b.v)+' · '+chinese(b.v):zodiac(b.v);if(v)facts.push([x.k,v]);return;}
    if(!s.v)return;if(x.id==='birth'){const [y,m,d]=s.v.split('-');facts.push(['Anniversaire',new Date(+y,+m-1,+d).toLocaleDateString(I18N.locale(),s.year?{day:'numeric',month:'long',year:'numeric'}:{day:'numeric',month:'long'})]);return;}
    if(x.id==='langs'&&p.langs&&p.langs.length){facts.push([x.k,p.langs.map(c=>I18N.name(c)).join(', ')]);return;}
    facts.push([x.k,s.v]);});
  Object.entries(F).forEach(([k,v])=>{if(typeof v==='string'&&v&&!FACTS.some(x=>x.id===k))facts.push([FACT_LABEL[k]||k,v]);});
  S.innerHTML=(preview?`<a class="back" href="#portrait">← Modifier mon portrait</a><p class="eyebrow">Ce que les autres voient</p>`:`<a class="back" href="#now">← Maintenant</a><p class="eyebrow">Portrait</p>`)+`
  <div class="hero">${App.avatarHtml(p)}<div><h1>${esc(dn(p))}</h1>${App.badge(p)}${p.intimate?' <span class="rtag t-int">Ta tribu</span>':''}${preview?'':App.langTag(me,p)}<p class="muted">${esc(preview&&!p.limited?(p.city||''):App.place(p))}${p.travel?' · en voyage':''}${preview?'':' · '+localTime(p)+' chez '+(f?'elle':'lui')}</p></div></div>
  ${isAvail(p)?`<div class="avail-card"><div class="k">Disponible${preview?' jusqu\'à '+hhmm(p.avail.until):' maintenant'}</div><div class="wants big">${p.avail.wants.map(k=>WANT[k]?WANT[k].l:'').join(' · ')}</div>${p.avail.note?`<p class="txt">${esc(p.avail.note)}</p>`:''}</div>`:''}
  <div class="intent">${App.shownIntent(p.intent).map(i=>`<span class="chip on ro">${INTENT_LABEL[i]}</span>`).join('')}</div>
  ${p.now?`<div class="now"><p class="eyebrow">En ce moment</p><p class="txt">${esc(p.now)}</p></div>`:''}
  ${p.limited?'':`<div class="voice-box"><p class="eyebrow" style="margin:0">${preview?'Ma voix':'Sa voix'}</p><div id="voice"></div></div>`}
  ${preview?'':`<div class="actions2"><a class="btn flame" href="#resonances/${p.id}">Nos résonances · ${nres}</a><a class="btn ghost" href="#messages/${p.id}">Conversation</a></div><div class="tb" id="tribe"></div>`}
  ${p.types&&p.types.list&&p.types.list.length&&p.types.show!==false?`<h2>${preview?'Mon':'Son'} <em>fonctionnement</em></h2><div class="types-show">${p.types.list.map(k=>`<span class="ttag t-${App.esc(k)}">${App.esc(TYPES.name(k))}</span>`).join('')}</div>`:''}
  ${facts.length?`<h2>Qui ${preview?'je':il} <em>${preview?'suis':'est'}</em></h2><div class="facts">${facts.map(([k,v])=>`<div class="fact"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('')}</div>`:''}
  ${Plus.viewHtml(p,me,preview,p.limited?'rep':null)}
  <h2>Ce qui ${preview?'me':(f?'la':'le')} fait <em>vibrer</em></h2>${preview?'':`<p class="muted small" style="margin-bottom:10px">Ouvre une entrée et réponds-y : c'est comme ça qu'on écrit à quelqu'un sur FeelShareLove.</p>`}<div class="list" id="v-list"></div>
  ${p.limited&&preview?`<div class="locked">Le reste de ton portrait (ce que tu vis en ce moment, ta voix, tes personnages, ce dans quoi tu t'investis, tes questions ouvertes…) n'est visible qu'une fois la conversation ouverte.</div>`:p.limited?`<div class="locked">Le reste de ${f?'son':'son'} portrait (ce qu'${il} vit en ce moment, sa voix, ses personnages, ce dans quoi ${il} s'investit, ses questions ouvertes…) s'ouvre quand vous aurez commencé à vous parler.</div>`:''}
  ${p.qs.filter(q=>q.a).length?`<h2>Questions <em>ouvertes</em></h2>${p.qs.filter(q=>q.a).map(q=>`<div class="q ro"><div class="k">${esc(q.k)}</div><div class="a">${esc(q.a)}</div></div>`).join('')}`:''}
  ${preview?'':`<div class="actions2"><button class="btn ghost" type="button" id="red">Ajouter à ma liste rouge</button><button class="btn ghost" type="button" id="rep">Signaler ce portrait</button></div><p class="muted small" id="done" style="margin-top:8px"></p>`}`;
  const L=$('v-list');if(!p.entries.length)L.innerHTML='<p class="muted small">Rien pour l\'instant.</p>';
  p.entries.forEach(e=>L.appendChild(App.entryEl(e,{hit:commons.has(e.id),reply:preview?null:async txt=>App.sendResultText(p,await App.sendTo(p,txt,e)),metoo:preview||commons.has(e.id)?null:d=>Plus.meToo(d,e,p)})));
  /* voix */
  const V=$('voice');const v=V&&await DB.get('voices',preview?'pres-me':'pres-'+p.id);
  if(!V){}
  else if(v)V.appendChild(App.audioEl(v.blob));
  else if(!preview&&!DB.remote&&window.speechSynthesis){const b=document.createElement('button');b.className='btn ghost';b.type='button';b.textContent='Écouter (voix de synthèse pour la démo)';b.addEventListener('click',()=>App.speak(`Bonjour, je suis ${dn(p)}. ${p.now}`));V.appendChild(b);}
  else if(V)V.innerHTML=`<p class="muted small">${preview?'Pas encore enregistrée. Tu peux le faire dans ton portrait.':'Pas encore enregistrée.'}</p>`;
  if(preview)return;
  /* ma tribu */
  await App.tribeBox(p,$('tribe'));
  $('red').addEventListener('click',async()=>{await DB.put('lists',{owner:'me',type:'red',target:p.id,name:p.name||p.pseudo,hint:p.city});$('done').textContent=dn(p)+' est sur ta liste rouge : '+il+' ne te verra plus. Tu peux l\'enlever dans Réglages.';});
  $('rep').addEventListener('click',async()=>{await DB.put('reports',{by:'me',target:p.id,kind:'profile',reason:'autre',status:'open',ts:Date.now()});$('done').textContent='Signalement transmis à l\'équipe FeelShareLove.';});
};
Pages.personne=async function(S,id){
  const p=await App.loadPerson(id);if(p)S.classList.toggle('tribe-bg',!!p.intimate);
  if(!p||p.isMe||await App.isBlocked(p)){S.innerHTML='<a class="back" href="#now">← Maintenant</a><div class="empty">Ce portrait n\'est pas disponible.</div>';return;}
  await Pages._view(S,p,false);
};
/* « Ce que les autres voient » : deux vues, comme sur le site. Avant de se parler, les autres ne voient qu'une partie du portrait
   (pays, envies, fonctionnement, signe et langues, métiers et rôles, ce qui fait vibrer) ; le reste s'ouvre avec la conversation. */
Pages.apercu=async function(S){const full=await App.loadPerson('me');let mode='avant';
  const limited=p=>{const f={};if(p.facts){if(p.facts.sign)f.sign=p.facts.sign;if(p.facts.langs)f.langs=p.facts.langs;}
    return {...p,limited:true,now:'',facts:f,qs:[],country:((p.city||'').match(/\s([A-Z]{2})$/)||[])[1]||(/^\d{4}$/.test(String(p.npa||'').trim())?'CH':'')};};
  async function draw(){await Pages._view(S,mode==='avant'?limited(full):full,true);
    /* l'aperçu doit trancher avec la page « Mon portrait » : bandeau clair en haut, portrait présenté dans un cadre */
    const e=S.querySelector('.eyebrow');if(!e)return;
    const ban=document.createElement('div');ban.className='ap-banner';
    ban.innerHTML=`<p class="ap-k">Aperçu</p><p class="ap-t">Ton portrait, vu par les autres</p><p class="ap-d">Tu ne peux rien modifier ici. Choisis qui regarde :</p>
      <div class="ap-switch"><button type="button" class="ap-tab${mode==='avant'?' on':''}" data-m="avant">Quelqu'un qui ne t'a pas encore parlé</button><button type="button" class="ap-tab${mode==='apres'?' on':''}" data-m="apres">Quelqu'un avec qui tu parles déjà</button></div>
      <p class="ap-d ap-note">${mode==='avant'?'Cette personne voit seulement une partie de ton portrait.':'Cette personne voit ton portrait complet. C\'est aussi ce que voit ta tribu.'}</p>`;
    e.replaceWith(ban);
    const fr=document.createElement('div');fr.className='ap-frame';while(ban.nextSibling)fr.appendChild(ban.nextSibling);ban.after(fr);
    S.querySelectorAll('.ap-tab').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.m===mode)return;mode=b.dataset.m;const y=S.scrollTop;draw().then(()=>{S.scrollTop=y;});}));}
  await draw();};
